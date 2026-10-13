import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('uploaded PDF opens in the mobile demo, while missing sample files never fake a link', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/documents')
    const sampleRow = page.locator('.document-mobile-card').filter({ hasText: 'DOC-2026-100' })
    await sampleRow.waitFor()
    await sampleRow.getByText('Демо: файл недоступен').waitFor()
    assert.equal(await sampleRow.getByRole('link', { name: 'Открыть PDF' }).count(), 0)

    await page.getByRole('button', { name: 'Новый черновик' }).click()
    const draft = page.getByRole('dialog', { name: 'Новый черновик документа' })
    await draft.getByLabel('Поиск сотрудника').fill('EMP-0001')
    await draft.getByRole('button', { name: 'Найти' }).click()
    const employee = draft.getByRole('combobox', { name: /^Сотрудник/ })
    await employee.locator('option').filter({ hasText: 'EMP-0001' }).waitFor({ state: 'attached' })
    await employee.selectOption({ index: 1 })
    await draft.getByLabel('Вид документа').selectOption('order')
    await draft.getByLabel('Название документа').fill('QA документ с вложенным PDF')
    await draft.getByLabel('Номер документа').fill('DEMO-PDF-26014')
    await draft.getByRole('button', { name: 'Создать черновик' }).click()
    await draft.waitFor({ state: 'hidden' })

    const card = page.locator('.document-mobile-card').filter({ hasText: 'DEMO-PDF-26014' })
    await card.waitFor()
    await card.getByRole('button', { name: 'Прикрепить PDF' }).click()
    const attachment = page.getByRole('dialog', { name: 'Прикрепить PDF' })
    await attachment.getByText(/На сервер файл не загружается/).waitFor()
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n', 'latin1')
    await attachment.locator('input[type="file"]').setInputFiles({
      name: 'demo-verified.pdf', mimeType: 'application/pdf', buffer: pdf,
    })
    await attachment.getByRole('button', { name: 'Прикрепить PDF' }).click()
    await attachment.waitFor({ state: 'hidden' })

    const link = card.getByRole('link', { name: 'Открыть PDF' })
    await link.waitFor()
    const href = await link.getAttribute('href')
    assert.ok(href?.startsWith('blob:'), 'demo file must be a real in-memory PDF URL')
    const file = await page.evaluate(async url => {
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      return { status: response.status, type: response.headers.get('content-type'), bytes: buffer.byteLength }
    }, href)
    assert.equal(file.status, 200)
    assert.match(file.type ?? '', /application\/pdf/)
    assert.equal(file.bytes, pdf.length)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})

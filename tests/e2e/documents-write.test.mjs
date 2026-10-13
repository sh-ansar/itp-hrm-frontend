import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HR creates a document draft, uploads private PDF and downloads it at mobile width', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Обзор системы' }).waitFor()

    await page.goto('/documents')
    await page.getByRole('heading', { name: 'Документы и приказы', level: 1 }).waitFor()
    await page.getByRole('button', { name: 'Новый черновик' }).click()
    const draft = page.getByRole('dialog', { name: 'Новый черновик документа' })
    await draft.waitFor()
    await draft.getByLabel('Поиск сотрудника').fill('E2E-001')
    await draft.getByRole('button', { name: 'Найти' }).click()
    await draft.getByRole('combobox', { name: /^Сотрудник/ }).locator('option').filter({ hasText: 'E2E-001' }).waitFor({ state: 'attached' })
    await draft.getByRole('combobox', { name: /^Сотрудник/ }).selectOption({ index: 1 })
    await draft.getByLabel('Вид документа').selectOption('order')
    await draft.getByLabel('Название документа').fill('Приказ о переводе E2E')
    await draft.getByLabel('Номер документа').fill('ORDER-C02-E2E')
    await draft.getByLabel('Дата документа').fill('2026-10-01')
    await draft.getByRole('button', { name: 'Создать черновик' }).click()

    const row = page.getByRole('row', { name: /ORDER-C02-E2E/ })
    await row.waitFor({ timeout: 15000 })
    assert.match(await row.innerText(), /Черновик/)
    await row.getByRole('button', { name: 'Прикрепить PDF' }).click()
    const attachment = page.getByRole('dialog', { name: 'Прикрепить PDF' })
    await attachment.waitFor()
    const pdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n' +
      'trailer\n<< /Root 1 0 R >>\n%%EOF\n',
      'latin1',
    )
    await attachment.locator('input[type="file"]').setInputFiles({
      name: 'e2e-document.pdf',
      mimeType: 'application/pdf',
      buffer: pdf,
    })
    await attachment.getByRole('button', { name: 'Прикрепить PDF' }).click()
    await row.getByRole('link', { name: 'Скачать PDF' }).waitFor({ timeout: 15000 })

    const downloadPromise = page.waitForEvent('download')
    await row.getByRole('link', { name: 'Скачать PDF' }).click()
    const download = await downloadPromise
    assert.equal(download.suggestedFilename(), 'document.pdf')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

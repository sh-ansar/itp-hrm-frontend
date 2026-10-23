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
    await page.getByRole('heading', { name: 'Главная' }).waitFor()

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

    const row = page.locator('.document-mobile-card').filter({ hasText: 'ORDER-C02-E2E' })
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
    const pdfLink = row.getByRole('link', { name: 'Открыть PDF' })
    await pdfLink.waitFor({ timeout: 15000 })
    const url = await pdfLink.getAttribute('href')
    const downloaded = await page.evaluate(async path => {
      const response = await fetch(path, { credentials: 'same-origin' })
      return { status: response.status, type: response.headers.get('content-type'), bytes: (await response.arrayBuffer()).byteLength }
    }, url)
    assert.equal(downloaded.status, 200)
    assert.ok(downloaded.type?.includes('application/pdf'))
    assert.ok(downloaded.bytes > 10)

    // Security regression: the exact real download URL is never publicly accessible.
    const unauthenticated = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' })
    try {
      const raw = await unauthenticated.request.get(url, { failOnStatusCode: false })
      assert.ok([401, 403, 404].includes(raw.status()), 'private file must reject anonymous access')
      assert.equal(raw.headers()['content-type']?.includes('application/pdf') ?? false, false,
        'unauthorized callers must not receive PDF bytes')
    } finally {
      await unauthenticated.close()
    }

    // Tenant UUID swapping and opaque UUID enumeration cannot escape company-scoped authorization.
    const wrongCompanyUrl = url.replace('11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222')
    assert.notEqual(wrongCompanyUrl, url, 'test must actually change the tenant identifier')
    const crossTenant = await page.evaluate(async path => {
      const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      return { status: response.status, type: response.headers.get('content-type') }
    }, wrongCompanyUrl)
    assert.ok([403, 404].includes(crossTenant.status), 'cross-tenant file access must be denied')

    const list = await page.evaluate(async () => {
      const response = await fetch('/api/v1/companies/11111111-1111-4111-8111-111111111111/documents', {
        credentials: 'same-origin', headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.text() }
    })
    assert.equal(list.status, 200)
    assert.equal(list.body.includes('storage_path'), false, 'never serialize object-store paths')
    assert.equal(list.body.includes('sha256'), false, 'never serialize private file hashes')
    assert.equal(list.body.includes('storage_disk'), false, 'never expose internal disk names')

    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

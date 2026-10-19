import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const base = '/api/v1/companies/' + company

async function login(browser, actor, width) {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 960 }, acceptDownloads: true })
  const page = await context.newPage()
  await page.goto('/login')
  const email = actor === 'admin' ? 'synthetic-bonus-approver@example.test' : 'synthetic-employee@example.test'
  const password = actor === 'admin' ? 'SyntheticBonusApproval-Only!2026' : 'SyntheticRole-Only!2026'
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  return { context, page }
}

async function request(page, url) {
  return page.evaluate(async path => {
    const response = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    return { status: response.status, type: response.headers.get('content-type'),
      cache: response.headers.get('cache-control'),
      body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : null }
  }, url)
}

test('HR explicitly shares private employee PDF; staff downloads own file and revocation denies it', async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.HRM_CHROME_PATH ? { executablePath: process.env.HRM_CHROME_PATH } : {}),
  })
  try {
    const admin = await login(browser, 'admin', 1440)
    const staff = await login(browser, 'employee', 375)

    // Link through administrator UI, never by matching name/email in the backend.
    await admin.page.goto('/roles')
    const account = admin.page.getByRole('row').filter({ hasText: 'synthetic-employee@example.test' })
    await account.getByRole('button').click()
    await admin.page.getByRole('menuitem', { name: 'Кабинет сотрудника' }).click()
    const link = admin.page.getByRole('combobox', { name: 'Кадровая запись', exact: true })
    await link.selectOption(employee)
    await admin.page.getByRole('button', { name: 'Сохранить связь', exact: true }).click()
    await admin.page.getByText('Связь учётной записи сохранена.', { exact: true }).waitFor()

    await staff.page.reload()
    await staff.page.getByRole('heading', { name: 'Мои документы', exact: true }).waitFor()
    await staff.page.getByText('Документы пока не опубликованы для вас.', { exact: true }).waitFor()

    // Create a real HR document and attach a private PDF through the browser.
    await admin.page.goto('/documents')
    await admin.page.getByRole('heading', { name: 'Документы и приказы', level: 1 }).waitFor()
    await admin.page.getByRole('button', { name: 'Новый черновик' }).click()
    const drawer = admin.page.getByRole('dialog', { name: 'Новый черновик документа' })
    await drawer.getByLabel('Поиск сотрудника').fill('E2E-001')
    await drawer.getByRole('button', { name: 'Найти' }).click()
    await drawer.getByRole('combobox', { name: /^Сотрудник/ }).locator('option')
      .filter({ hasText: 'E2E-001' }).waitFor({ state: 'attached' })
    await drawer.getByRole('combobox', { name: /^Сотрудник/ }).selectOption({ index: 1 })
    await drawer.getByLabel('Вид документа').selectOption('contract')
    await drawer.getByLabel('Название документа').fill('Персональный договор E2E')
    await drawer.getByLabel('Номер документа').fill('PRIVATE-DOC-2026')
    await drawer.getByLabel('Дата документа').fill('2026-10-01')
    await drawer.getByRole('button', { name: 'Создать черновик' }).click()
    const row = admin.page.getByRole('row').filter({ hasText: 'Персональный договор E2E' })
    await row.getByRole('button', { name: 'Прикрепить PDF' }).click()
    const upload = admin.page.getByRole('dialog', { name: 'Прикрепить PDF' })
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
      + '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n', 'latin1')
    await upload.locator('input[type="file"]').setInputFiles({
      name: 'e2e-private-personal-document.pdf', mimeType: 'application/pdf', buffer: pdf,
    })
    await upload.getByRole('button', { name: 'Прикрепить PDF' }).click()
    await row.getByRole('button', { name: 'Поделиться', exact: true }).waitFor()
    assert.equal((await request(staff.page, base + '/me/documents')).body.data.length, 0)

    // Sharing requires a second explicit confirmation in HR UI.
    await row.getByRole('button', { name: 'Поделиться', exact: true }).click()
    const sharing = admin.page.getByRole('dialog', { name: 'Доступ сотрудника к PDF' })
    await sharing.getByRole('button', { name: 'Поделиться', exact: true }).click()
    await admin.page.getByText('PDF теперь доступен сотруднику в личном кабинете.', { exact: true }).waitFor()

    await staff.page.reload()
    await staff.page.getByRole('heading', { name: 'Мои документы', exact: true }).waitFor()
    await staff.page.getByText('Персональный договор E2E', { exact: true }).waitFor()
    const list = await request(staff.page, base + '/me/documents')
    assert.equal(list.status, 200)
    assert.equal(list.body.data.length, 1)
    assert.ok(!('storage_path' in list.body.data[0]))
    assert.ok(!('document_number' in list.body.data[0]))
    const id = list.body.data[0].id
    const fileUrl = base + '/me/documents/' + id + '/file'
    assert.equal((await request(staff.page, base + '/documents')).status, 403)
    const own = await request(staff.page, fileUrl)
    assert.equal(own.status, 200)
    assert.ok(own.type.includes('application/pdf'))
    assert.ok(own.cache.includes('no-store'))
    const [download] = await Promise.all([
      staff.page.waitForEvent('download'),
      staff.page.getByRole('link', { name: 'Скачать PDF' }).click(),
    ])
    assert.match(download.suggestedFilename(), /document\.pdf/)
    for (const width of [375, 768, 1440]) {
      await staff.page.setViewportSize({ width, height: 960 })
      assert.ok(await staff.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    }

    // Revocation does not delete HR's private file but stops all subsequent employee reads.
    await row.getByRole('button', { name: 'Отозвать доступ' }).click()
    await sharing.getByRole('button', { name: 'Отозвать доступ', exact: true }).click()
    await admin.page.getByText('Доступ сотрудника к PDF отозван.', { exact: true }).waitFor()
    await staff.page.reload()
    await staff.page.getByText('Документы пока не опубликованы для вас.', { exact: true }).waitFor()
    assert.equal((await request(staff.page, fileUrl)).status, 404)
    const staffList = await request(staff.page, base + '/me/documents')
    assert.equal(staffList.body.data.length, 0)
    await admin.page.getByRole('link', { name: 'Открыть PDF' }).waitFor()
    await admin.context.close()
    await staff.context.close()
  } finally {
    await browser.close()
  }
})

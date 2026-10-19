import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const base = '/api/v1/companies/' + company
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  + '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n')

async function login(browser, actor, width = 1440) {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 960 } })
  const page = await context.newPage()
  await page.goto('/login')
  const email = actor === 'hr' ? 'synthetic-e2e@example.test'
    : actor === 'admin' ? 'synthetic-bonus-approver@example.test'
      : 'synthetic-employee@example.test'
  const password = actor === 'hr' ? 'SyntheticE2E-Only!2026'
    : actor === 'admin' ? 'SyntheticBonusApproval-Only!2026' : 'SyntheticRole-Only!2026'
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  return { page, context }
}
async function api(page, path, method = 'GET', payload) {
  return page.evaluate(async ({ path, method, payload }) => {
    const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice(11)
    const response = await fetch(path, {
      method, credentials: 'same-origin', headers: {
        Accept: 'application/json', 'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    })
    return { status: response.status, body: response.status === 204 ? null
      : (response.headers.get('content-type')?.includes('json') ? await response.json() : null) }
  }, { path, method, payload })
}
async function createOrderViaHR(page, title, number) {
  await page.goto('/documents')
  await page.getByRole('button', { name: 'Новый черновик', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Новый черновик документа' })
  await drawer.getByLabel('Поиск сотрудника').fill('E2E-001')
  await drawer.getByRole('button', { name: 'Найти', exact: true }).click()
  await drawer.getByRole('combobox', { name: /^Сотрудник/ }).locator('option')
    .filter({ hasText: 'E2E-001' }).waitFor({ state: 'attached' })
  await drawer.getByRole('combobox', { name: /^Сотрудник/ }).selectOption({ index: 1 })
  await drawer.getByLabel('Вид документа').selectOption('order')
  await drawer.getByLabel('Название документа').fill(title)
  await drawer.getByLabel('Номер документа').fill(number)
  await drawer.getByLabel('Дата документа').fill('2026-10-19')
  await drawer.getByRole('button', { name: 'Создать черновик', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: title })
  await row.getByRole('button', { name: 'Прикрепить PDF', exact: true }).click()
  const upload = page.getByRole('dialog', { name: 'Прикрепить PDF' })
  await upload.locator('input[type="file"]').setInputFiles({
    name: 'synthetic-unsigned.pdf', mimeType: 'application/pdf', buffer: pdf,
  })
  await upload.getByRole('button', { name: 'Прикрепить PDF', exact: true }).click()
  await row.getByRole('button', { name: 'Отправить приказ', exact: true }).waitFor()
  return row
}

test('HR prepares an order PDF; separate company admin approves; employee sees only an explicitly shared copy', async () => {
  const browser = await chromium.launch({
    headless: true, ...(process.env.HRM_CHROME_PATH ? { executablePath: process.env.HRM_CHROME_PATH } : {}),
  })
  try {
    const hr = await login(browser, 'hr')
    const admin = await login(browser, 'admin', 1440)
    const staff = await login(browser, 'employee', 375)

    const row = await createOrderViaHR(hr.page, 'Synthetic internal approval order', 'ORD-WF-2026-1')
    await row.getByRole('button', { name: 'Отправить приказ', exact: true }).click()
    const submit = hr.page.getByRole('dialog', { name: 'Согласование приказа', exact: true })
    await submit.getByText('Внутреннее согласование PDF', { exact: false }).waitFor()
    await submit.getByRole('button', { name: 'Подтвердить', exact: true }).click()
    await row.getByText('На согласовании', { exact: true }).waitFor()
    assert.equal(await row.getByRole('button', { name: 'Поделиться' }).count(), 0)

    const hrList = await api(hr.page, base + '/documents?document_type=order')
    const order = hrList.body.data.find(r => r.title === 'Synthetic internal approval order')
    assert.ok(order)
    assert.equal(order.status, 'submitted')
    assert.equal(order.has_file, true)
    assert.ok(order.created_by_user_id)
    assert.equal((await api(hr.page, base + '/documents/' + order.id + '/decision',
      'POST', { revision: 3, decision: 'approved' })).status, 404)

    // Link the employee through the actual role administration UI.
    await admin.page.goto('/roles')
    const account = admin.page.getByRole('row').filter({ hasText: 'synthetic-employee@example.test' })
    await account.getByRole('button').click()
    await admin.page.getByRole('menuitem', { name: 'Кабинет сотрудника' }).click()
    await admin.page.getByRole('combobox', { name: 'Кадровая запись', exact: true }).selectOption(employee)
    await admin.page.getByRole('button', { name: 'Сохранить связь', exact: true }).click()
    await admin.page.getByText('Связь учётной записи сохранена.', { exact: true }).waitFor()
    assert.equal((await api(staff.page, base + '/me/documents')).body.data.length, 0)

    // Mobile uses the same review component as desktop.
    await admin.page.setViewportSize({ width: 375, height: 960 })
    await admin.page.goto('/documents')
    const mobile = admin.page.locator('.document-mobile-card')
      .filter({ hasText: 'Synthetic internal approval order' })
    await mobile.getByText('На согласовании', { exact: true }).waitFor()
    await mobile.getByRole('button', { name: 'Согласовать', exact: true }).click()
    const review = admin.page.getByRole('dialog', { name: 'Согласование приказа', exact: true })
    await review.getByRole('button', { name: 'Подтвердить', exact: true }).click()
    await mobile.getByText('Согласован', { exact: true }).waitFor()
    assert.equal((await api(staff.page, base + '/me/documents')).body.data.length, 0)
    await mobile.getByRole('button', { name: 'Поделиться', exact: true }).click()
    await admin.page.getByRole('dialog', { name: 'Доступ сотрудника к PDF' })
      .getByRole('button', { name: 'Поделиться', exact: true }).click()

    await staff.page.reload()
    await staff.page.getByRole('heading', { name: 'Мои документы', exact: true }).waitFor()
    const own = await api(staff.page, base + '/me/documents')
    assert.equal(own.status, 200)
    assert.equal(own.body.data.length, 1)
    assert.equal(own.body.data[0].id, order.id)
    assert.equal((await api(staff.page, base + '/documents')).status, 403)
    const file = await staff.page.evaluate(async path => {
      const response = await fetch(path, { credentials: 'same-origin' })
      return { status: response.status, kind: response.headers.get('content-type') }
    }, base + '/me/documents/' + order.id + '/file')
    assert.equal(file.status, 200)
    assert.equal(file.kind, 'application/pdf')

    const actions = await api(hr.page, base + '/personnel-actions')
    assert.equal(actions.status, 200)
    assert.equal(actions.body.data.length, 0,
      'Approving an internal PDF review must never change employee assignments')
    for (const width of [375, 768, 1440]) {
      await admin.page.setViewportSize({ width, height: 960 })
      assert.ok(await admin.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    }
    await staff.context.close()
    await admin.context.close()
    await hr.context.close()
  } finally {
    await browser.close()
  }
})

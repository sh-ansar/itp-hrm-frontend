import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const base = `/api/v1/companies/${company}`
async function login(browser, role, width) {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 1000 } })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(role === 'admin' ? 'synthetic-bonus-approver@example.test' : 'synthetic-employee@example.test')
  await page.getByLabel('Пароль').fill(role === 'admin' ? 'SyntheticBonusApproval-Only!2026' : 'SyntheticRole-Only!2026')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  return { context, page }
}
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
    const response = await fetch(path, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, body: await response.json() }
  }, { path, method, body })
}
test('admin links an account; employee saves, reloads, submits; admin approves; own leave appears', async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.HRM_CHROME_PATH ? { executablePath: process.env.HRM_CHROME_PATH } : {}) })
  try {
    const admin = await login(browser, 'admin', 1440)
    const staff = await login(browser, 'employee', 375)
    const { page } = staff
    await page.getByText('Учётная запись не связана с сотрудником. Обратитесь к администратору компании.', { exact: true }).waitFor()
    const users = await api(admin.page, base + '/memberships')
    const user = users.body.data.find(u => u.email === 'synthetic-employee@example.test')
    assert.ok(user)
    await admin.page.goto('/roles')
    const row = admin.page.getByRole('row').filter({ hasText: 'synthetic-employee@example.test' })
    await row.getByRole('button').click()
    await admin.page.getByRole('menuitem', { name: 'Кабинет сотрудника', exact: true }).click()
    const selector = admin.page.getByRole('combobox', { name: 'Кадровая запись', exact: true })
    await selector.selectOption(employee)
    await admin.page.getByRole('button', { name: 'Сохранить связь', exact: true }).click()
    await admin.page.getByText('Связь учётной записи сохранена.', { exact: true }).waitFor()
    const typeResult = await api(admin.page, base + '/leave-types', 'POST', { code: 'self_annual', name: 'Synthetic self-service leave', annual_days: 24, balance_method: 'calendar_days', category: 'ordinary' })
    assert.equal(typeResult.status, 201)
    // Record one attendance day through the authorized HRM worktime API before employee reload.
    const recorded = await api(admin.page, base + `/worktime/timesheet/${employee}`, 'PUT', {
      month: '2026-10', days: [{
        date: '2026-10-15', worked_minutes: 420, absence_minutes: 60,
        overtime_minutes: 0, revision: null,
      }],
    })
    assert.equal(recorded.status, 200)
    await page.reload()
    await page.getByRole('heading', { name: 'Synthetic Employee', exact: true }).waitFor()
    assert.equal(await page.locator('.sidebar').count(), 0)
    // The employee can read own hours, not change an administrative timesheet.
    await page.getByRole('heading', { name: 'Мой табель', exact: true }).waitFor()
    await page.getByLabel('Месяц', { exact: true }).fill('2026-10')
    const recordedDay = page.locator('.own-timesheet__table tbody tr').filter({ hasText: '2026-10-15' })
    await recordedDay.getByText('7 ч', { exact: true }).waitFor()
    assert.equal(await page.locator('.own-timesheet__table tbody tr').count(), 31)
    const ownTimesheet = await api(page, base + '/me/timesheet?month=2026-10')
    assert.equal(ownTimesheet.status, 200)
    assert.equal(ownTimesheet.body.meta.can_edit, false)
    assert.equal(ownTimesheet.body.data.find(day => day.date === '2026-10-15').worked_minutes, 420)
    assert.equal(ownTimesheet.body.data.find(day => day.date === '2026-10-16').worked_minutes, null)
    assert.equal((await api(page, base + '/me/timesheet?month=2026-10&employee_id=' + employee)).status, 422)
    assert.equal((await api(page, base + `/worktime/timesheet/${employee}?month=2026-10`)).status, 403)
    await page.getByLabel('Месяц', { exact: true }).fill('2026-11')
    await page.getByText('Производственный календарь за этот месяц пока не заполнен.', { exact: true }).waitFor()
    await page.getByLabel('Месяц', { exact: true }).fill('2026-10')
    await recordedDay.getByText('7 ч', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Подать заявку', exact: true }).click()
    await page.getByRole('combobox', { name: 'Вид отпуска', exact: true }).selectOption(typeResult.body.data.id)
    await page.getByLabel('Начало отпуска', { exact: false }).fill('2026-11-01')
    await page.getByLabel('Окончание отпуска', { exact: false }).fill('2026-11-05')
    await page.getByLabel('Комментарий к плану', { exact: true }).fill('Synthetic employee request')
    await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click()
    await page.getByText('Synthetic employee request', { exact: true }).waitFor()
    await page.reload()
    await page.getByText('Synthetic employee request', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Изменить', exact: true }).click()
    await page.getByLabel('Окончание отпуска', { exact: false }).fill('2026-11-06')
    await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
    await page.getByRole('button', { name: 'Отправить на согласование', exact: true }).click()
    await page.getByText(/На согласовании/).waitFor()
    const own = await api(page, base + '/me/workspace')
    const request = own.body.data.requests[0]
    assert.equal(request.planned_days, 6)
    assert.equal((await api(page, base + '/employees')).status, 403)
    assert.equal((await api(page, base + '/leave-requests')).status, 403)
    assert.equal((await api(page, base + `/leave-requests/${request.id}/decision`, 'POST', { revision: request.revision, decision: 'approved' })).status, 403)
    await admin.page.goto('/leaves')
    await admin.page.getByRole('button', { name: 'Управление отпусками', exact: true }).click()
    const requestRow = admin.page.locator('.leave-management-row').filter({ hasText: 'Synthetic self-service leave' })
    admin.page.once('dialog', dialog => dialog.accept())
    await requestRow.getByRole('button', { name: 'Утвердить', exact: true }).click()
    await page.reload()
    await page.getByText(/Утверждено/).waitFor()
    const result = await api(page, base + '/me/workspace')
    assert.equal(result.body.data.requests[0].status, 'approved')
    assert.equal(result.body.data.leaves.length, 1)
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    }
    await page.evaluate(() => document.documentElement.dataset.theme = 'dark')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await admin.context.close(); await staff.context.close()
  } finally { await browser.close() }
})
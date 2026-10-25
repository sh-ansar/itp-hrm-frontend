import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const origin = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const base = '/api/v1/companies/' + company
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.cookie.split('; ').find(v => v.startsWith('XSRF-TOKEN='))?.slice(11)
    const response = await fetch(path, { method, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() }
  }, { path, method, body })
}
async function login(browser, email, password) {
  const context = await browser.newContext({ baseURL: origin, viewport: { width: 1280, height: 850 } })
  const page = await context.newPage()
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await Promise.all([page.waitForURL(url => !url.pathname.endsWith('/login')),
    page.locator('.login-form button[type=submit]').click()])
  return { context, page }
}
test('future approved leave cancellation restores persisted balance and schedule through real Laravel API', async () => {
  assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/)
  const browser = await chromium.launch({ headless: true })
  try {
    const admin = await login(browser, 'synthetic-bonus-approver@example.test', 'SyntheticBonusApproval-Only!2026')
    const hr = await login(browser, 'synthetic-e2e@example.test', 'SyntheticE2E-Only!2026')
    const suffix = Date.now()
    const typeName = 'Synthetic reversible annual leave ' + suffix
    const createdEmployee = await api(hr.page, base + '/employees', 'POST', {
      personnel_number: 'REV-' + suffix, first_name: 'Synthetic', last_name: 'Reversal Worker',
    })
    assert.equal(createdEmployee.status, 201)
    const employee = createdEmployee.body.data.id
    const errors = []
    admin.page.on('pageerror', e => errors.push(e.message))
    const type = await api(admin.page, base + '/leave-types', 'POST', {
      code: 'reversal_' + suffix, name: typeName,
      annual_days: 24, balance_method: 'calendar_days',
    })
    assert.equal(type.status, 201)
    const year = new Date().getFullYear() + 1
    const from = year + '-06-01', to = year + '-06-05'
    const grant = await api(admin.page, base + '/leave-balances/periods', 'POST', {
      employee_id: employee, leave_type_id: type.body.data.id, year, granted_days: 24,
      reason: 'Explicit isolated test entitlement',
    })
    assert.equal(grant.status, 201)
    const payload = { employee_id: employee, leave_type_id: type.body.data.id,
      planned_started_on: from, planned_ended_on: to, note: null }
    const draft = await api(hr.page, base + '/leave-requests', 'POST', payload)
    assert.equal(draft.status, 201)
    const path = base + '/leave-requests/' + draft.body.data.id
    assert.equal((await api(hr.page, path + '/submit', 'POST', { revision: 1 })).status, 200)
    const approved = await api(admin.page, path + '/decision', 'POST', { revision: 2, decision: 'approved' })
    assert.equal(approved.status, 200)
    const balance = async () => (await api(admin.page,
      base + '/leave-balances?year=' + year + '&employee_id=' + employee)).body.data.find(v => v.leave_type_id === type.body.data.id)
    assert.equal((await balance()).available_days, 19)
    await hr.page.goto('/leaves')
    await hr.page.getByRole('button', { name: 'Управление отпусками', exact: true }).click()
    await hr.page.locator('.leave-management-row').filter({ hasText: typeName }).waitFor()
    assert.equal(await hr.page.getByRole('button', { name: 'Отменить утверждённый отпуск', exact: true }).count(), 0)
    await admin.page.goto('/leaves')
    await admin.page.getByRole('button', { name: 'Управление отпусками', exact: true }).click()
    const row = admin.page.locator('.leave-management-row').filter({ hasText: typeName })
    await row.getByRole('button', { name: 'Отменить утверждённый отпуск', exact: true }).click()
    const dialog = admin.page.getByRole('dialog', { name: 'Отменить утверждённый отпуск', exact: true })
    const confirm = dialog.getByRole('button', { name: 'Подтвердить отмену', exact: true })
    assert.equal(await confirm.isDisabled(), true)
    await dialog.getByLabel('Причина отмены').fill('Synthetic employee changed future plans')
    const [response] = await Promise.all([
      admin.page.waitForResponse(r => r.url().endsWith('/reverse-approved') && r.request().method() === 'POST'),
      confirm.click(),
    ])
    assert.equal(response.status(), 200)
    await dialog.waitFor({ state: 'hidden' })
    await row.getByText('Причина отмены: Synthetic employee changed future plans', { exact: true }).waitFor()
    assert.equal((await balance()).available_days, 24)
    const schedule = await api(admin.page, base + '/leaves?year=' + year)
    assert.ok(!schedule.body.data.some(v => v.id === approved.body.data.published_leave_id))
    const list = await api(admin.page, base + '/leave-requests')
    const reversed = list.body.data.find(v => v.id === draft.body.data.id)
    assert.equal(reversed.status, 'cancelled')
    assert.equal(reversed.reversal_reason, 'Synthetic employee changed future plans')
    assert.equal((await api(admin.page, path + '/reverse-approved', 'POST', {
      revision: reversed.revision, reason: 'Repeated synthetic request',
    })).status, 409)
    assert.equal((await api(hr.page, base + '/leave-requests', 'POST', payload)).status, 201)
    assert.deepEqual(errors, [])
    await admin.context.close(); await hr.context.close()
  } finally { await browser.close() }
})

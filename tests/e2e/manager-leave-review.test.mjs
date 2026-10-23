import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const origin = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const actors = {
  admin: ['synthetic-bonus-approver@example.test', 'SyntheticBonusApproval-Only!2026'],
  hr: ['synthetic-e2e@example.test', 'SyntheticE2E-Only!2026'],
  manager: ['synthetic-manager@example.test', 'SyntheticRole-Only!2026'],
}
async function login(browser, name) {
  const context = await browser.newContext({ baseURL: origin, viewport: { width: 1280, height: 850 } })
  const page = await context.newPage()
  await page.goto('/login')
  await page.locator('input[type=email]').fill(actors[name][0])
  await page.locator('input[type=password]').fill(actors[name][1])
  const [result] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/auth/login') && response.request().method() === 'POST'),
    page.locator('button[type=submit]').click(),
  ])
  assert.equal(result.status(), 200, name + ' login')
  await page.waitForURL(url => url.pathname !== '/login')
  return { context, page }
}
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.cookie.split('; ').find(item => item.startsWith('XSRF-TOKEN='))?.slice(11)
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: response.status === 204 ? null : await response.json() }
  }, { path, method, body })
}
async function openManagement(page) {
  await page.goto('/leaves')
  const open = page.getByRole('button', { name: 'Управление отпусками', exact: true })
  await open.waitFor({ timeout: 45000 })
  await open.click()
  await page.locator('.leave-management').waitFor()
}
test('manager recommends only scoped leave; distinct company approver finally publishes', async () => {
  const browser = await chromium.launch({ headless: true })
  const errors = []
  try {
    {
      const { context, page } = await login(browser, 'admin')
      page.on('pageerror', error => errors.push('admin: ' + error.message))
      await openManagement(page)
      await page.locator('.leave-management').getByRole('button', { name: 'Добавить вид отпуска' }).click()
      const dialog = page.getByRole('dialog', { name: 'Добавить вид отпуска' })
      await dialog.locator('input[type=text]').nth(0).fill('manager_review_e2e')
      await dialog.locator('input[type=text]').nth(1).fill('Manager Review E2E')
      await dialog.getByRole('button', { name: 'Добавить вид отпуска' }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 30000 })
      await context.close()
    }
    let requestId
    {
      const { context, page } = await login(browser, 'hr')
      page.on('pageerror', error => errors.push('hr: ' + error.message))
      await openManagement(page)
      await page.locator('.leave-management').getByRole('button', { name: 'Запланировать отпуск' }).click()
      const dialog = page.getByRole('dialog', { name: 'Запланировать отпуск' })
      await dialog.locator('select').nth(0).selectOption(employee)
      await dialog.locator('select').nth(1).selectOption({ label: 'Manager Review E2E' })
      await dialog.locator('input[type=date]').nth(0).fill('2026-11-10')
      await dialog.locator('input[type=date]').nth(1).fill('2026-11-13')
      await dialog.getByRole('button', { name: 'Сохранить черновик' }).click()
      await dialog.waitFor({ state: 'hidden' })
      await page.locator('.leave-management').getByRole('button', { name: 'Отправить на согласование' }).waitFor()
      page.once('dialog', dialog => dialog.accept())
      await page.locator('.leave-management').getByRole('button', { name: 'Отправить на согласование' }).click()
      const path = '/api/v1/companies/' + company + '/leave-requests'
      await page.getByText('На согласовании', { exact: false }).first().waitFor({ timeout: 30000 })
      const result = await api(page, path)
      assert.equal(result.status, 200)
      const request = result.data.data.find(row => row.leave_type_name === 'Manager Review E2E')
      assert.ok(request)
      requestId = request.id
      assert.equal(request.manager_recommendation, null)
      assert.equal(await page.locator('.leave-management').getByRole('button', { name: 'Утвердить' }).count(), 0,
        'HR must not bypass manager review')
      await context.close()
    }
    {
      const { context, page } = await login(browser, 'manager')
      page.on('pageerror', error => errors.push('manager: ' + error.message))
      let typeRequests = 0
      page.on('request', request => { if (request.url().includes('/leave-types')) typeRequests++ })
      await openManagement(page)
      await page.getByText('Вид отпуска скрыт').first().waitFor()
      assert.equal(typeRequests, 0, 'manager must never request protected leave types')
      const panel = page.locator('.leave-management')
      assert.equal(await panel.getByRole('button', { name: 'Добавить вид отпуска' }).count(), 0)
      assert.equal(await panel.getByRole('button', { name: 'Запланировать отпуск' }).count(), 0)
      assert.equal(await panel.getByRole('button', { name: 'Отменить заявку' }).count(), 0)
      assert.equal(await panel.getByRole('button', { name: 'Утвердить' }).count(), 0)
      await panel.getByRole('button', { name: 'Согласовать как руководитель' }).click()
      const dialog = page.getByRole('dialog', { name: 'Согласование руководителя' })
      await dialog.waitFor()
      page.once('dialog', dialog => dialog.accept())
      await dialog.getByRole('button', { name: 'Согласовать', exact: true }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 30000 })
      await panel.getByText('Согласовано').waitFor()
      const path = '/api/v1/companies/' + company
      const result = await api(page, path + '/leave-requests')
      assert.equal(result.status, 200)
      const reviewed = result.data.data.find(row => row.id === requestId)
      assert.ok(reviewed)
      assert.equal(reviewed.status, 'submitted', 'manager cannot publish leave')
      assert.equal(reviewed.manager_recommendation, 'approved')
      const forbidden = await api(page, path + '/leave-requests/' + requestId + '/decision',
        'POST', { revision: reviewed.revision, decision: 'approved', comment: null })
      assert.equal(forbidden.status, 403)
      const crossTenant = await api(page, '/api/v1/companies/22222222-2222-4222-8222-222222222222/leave-requests')
      assert.equal(crossTenant.status, 403)
      await context.close()
    }
    {
      const { context, page } = await login(browser, 'admin')
      page.on('pageerror', error => errors.push('final company approver: ' + error.message))
      await openManagement(page)
      const panel = page.locator('.leave-management')
      await panel.getByText('Согласовано').waitFor()
      page.once('dialog', dialog => dialog.accept())
      await panel.getByRole('button', { name: 'Утвердить' }).click()
      await panel.getByText('Утверждено').waitFor({ timeout: 30000 })
      const result = await api(page, '/api/v1/companies/' + company + '/leave-requests')
      assert.equal(result.status, 200)
      const approved = result.data.data.find(row => row.id === requestId)
      assert.equal(approved.status, 'approved')
      assert.ok(approved.published_leave_id)
      const schedule = await api(page, '/api/v1/companies/' + company + '/leaves?year=2026&page=1')
      assert.equal(schedule.status, 200)
      assert.ok(schedule.data.data.some(row => row.employee_id === employee && row.days === 4))
      await context.close()
    }
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

test('manager rejection requires reason, is terminal and cannot publish a second leave', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    let requestId
    {
      const { context, page } = await login(browser, 'hr')
      await openManagement(page)
      await page.locator('.leave-management').getByRole('button', { name: 'Запланировать отпуск' }).click()
      const dialog = page.getByRole('dialog', { name: 'Запланировать отпуск' })
      await dialog.locator('select').nth(0).selectOption(employee)
      await dialog.locator('select').nth(1).selectOption({ label: 'Manager Review E2E' })
      await dialog.locator('input[type=date]').nth(0).fill('2026-12-02')
      await dialog.locator('input[type=date]').nth(1).fill('2026-12-04')
      await dialog.getByRole('button', { name: 'Сохранить черновик' }).click()
      await dialog.waitFor({ state: 'hidden' })
      page.once('dialog', dialog => dialog.accept())
      await page.locator('.leave-management').getByRole('button', { name: 'Отправить на согласование' }).click()
      const result = await api(page, '/api/v1/companies/' + company + '/leave-requests')
      assert.equal(result.status, 200)
      const row = result.data.data.find(row => row.planned_started_on === '2026-12-02')
      assert.ok(row, 'separate December request persisted')
      assert.equal(row.status, 'submitted')
      requestId = row.id
      await context.close()
    }
    {
      const { context, page } = await login(browser, 'manager')
      await openManagement(page)
      const current = await api(page, '/api/v1/companies/' + company + '/leave-requests')
      assert.equal(current.status, 200)
      const row = current.data.data.find(row => row.id === requestId)
      assert.ok(row)
      const withoutReason = await api(page,
        '/api/v1/companies/' + company + '/leave-requests/' + requestId + '/manager-decision',
        'POST', { revision: row.revision, decision: 'rejected' })
      assert.equal(withoutReason.status, 422, 'manager rejection must explain reason')
      const panel = page.locator('.leave-management')
      await panel.getByRole('button', { name: 'Отклонить как руководитель' }).click()
      const dialog = page.getByRole('dialog', { name: 'Согласование руководителя' })
      assert.equal(await dialog.getByRole('button', { name: 'Отклонить', exact: true }).isDisabled(), true)
      await dialog.locator('textarea').fill('Synthetic QA scoped rejection')
      page.once('dialog', dialog => dialog.accept())
      await dialog.getByRole('button', { name: 'Отклонить', exact: true }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 30000 })
      await context.close()
    }
    {
      const { context, page } = await login(browser, 'hr')
      await openManagement(page)
      const result = await api(page, '/api/v1/companies/' + company + '/leave-requests')
      assert.equal(result.status, 200)
      const rejected = result.data.data.find(row => row.id === requestId)
      assert.ok(rejected)
      assert.equal(rejected.status, 'rejected')
      assert.equal(rejected.manager_recommendation, 'rejected')
      assert.equal(rejected.published_leave_id, null)
      const denial = await api(page,
        '/api/v1/companies/' + company + '/leave-requests/' + requestId + '/decision',
        'POST', { revision: rejected.revision, decision: 'approved', comment: null })
      assert.ok(denial.status >= 400, 'rejected leave must not be finally approved')
      const schedule = await api(page, '/api/v1/companies/' + company + '/leaves?year=2026&page=1')
      assert.equal(schedule.status, 200)
      assert.equal(schedule.data.data.filter(row => row.employee_id === employee).length, 1,
        'rejected period must never publish; first approved period remains')
      await context.close()
    }
  } finally { await browser.close() }
})

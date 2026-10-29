import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const root = '/api/v1/companies/' + company + '/worktime'

async function login(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  const [loginResponse] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Войти', exact: true }).click(),
  ])
  assert.equal(loginResponse.status(), 200)
  // A user's configured start screen need not be the dashboard.
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  await page.goto('/timesheets')
  await page.locator('input[type=month]').fill('2026-10')
}

async function api(page, url, method = 'GET', body) {
  return page.evaluate(async ({ url, method, body }) => {
    const token = document.cookie.split('; ')
      .find(value => value.startsWith('XSRF-TOKEN='))?.slice(11)
    const response = await fetch(url, {
      method, credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    }
  }, { url, method, body })
}

test('HR directly enters and corrects attendance; no approval controls, manager cannot post actuals',
  { timeout: 120000 }, async () => {
    const browser = await chromium.launch({ headless: true })
    const hr = await browser.newPage({ baseURL, viewport: { width: 1440, height: 1000 } })
    const manager = await browser.newPage({ baseURL, viewport: { width: 430, height: 900 } })
    try {
      await login(hr, 'synthetic-e2e@example.test', 'SyntheticE2E-Only!2026')
      const monthly = await api(hr, root + '/timesheet?month=2026-10')
      assert.equal(monthly.status, 200)
      assert.equal(monthly.body.meta.worktime_writes_enabled, true)
      assert.equal(monthly.body.meta.period_locked, false)

      assert.equal(await hr.getByText('Согласование табеля', { exact: true }).count(), 0)
      assert.equal(await hr.getByRole('button', { name: 'Отправить на утверждение' }).count(), 0)
      assert.equal(await hr.getByRole('button', { name: 'Утвердить период' }).count(), 0)

      const employeeRow = hr.getByRole('row').filter({ hasText: 'Synthetic Employee' })
      await employeeRow.getByRole('button', { name: 'Заполнить', exact: true }).click()
      const drawer = hr.getByRole('dialog', { name: 'Табель сотрудника', exact: true })
      await drawer.getByRole('button', { name: 'Заполнить по плану', exact: true }).click()
      await drawer.getByRole('button', { name: 'Сохранить табель', exact: true }).click()
      await drawer.getByText('Табель сохранён.', { exact: true }).waitFor()
      await drawer.locator('.drawer-footer')
        .getByRole('button', { name: 'Закрыть', exact: true }).click()

      const loaded = await api(hr, root + '/timesheet/' + employee + '?month=2026-10')
      assert.equal(loaded.status, 200)
      const day = loaded.body.data.find(item => item.date === '2026-10-15')
      assert.ok(day && day.revision !== null, 'HR creates real revisioned attendance')
      const corrected = await api(hr, root + '/timesheet/' + employee, 'PUT', {
        month: '2026-10',
        days: [{
          date: day.date, worked_minutes: 420,
          absence_minutes: 0, overtime_minutes: 0, revision: day.revision,
        }],
      })
      assert.equal(corrected.status, 200)
      assert.equal(corrected.body.data.find(item => item.date === day.date).worked_minutes, 420)

      await hr.reload()
      // The grid loads asynchronously after navigation; do not assert before hydration.
      await hr.getByRole('row').filter({ hasText: 'Synthetic Employee' })
        .getByRole('button', { name: 'Заполнить', exact: true }).waitFor()
      assert.equal(await hr.getByRole('row').filter({ hasText: 'Synthetic Employee' })
        .getByRole('button', { name: 'Заполнить', exact: true }).count(), 1)
      assert.equal((await api(hr, root + '/periods?month=2026-10')).status, 404,
        'No timesheet approval workflow in HR direct-entry mode')

      await login(manager, 'synthetic-manager@example.test', 'SyntheticRole-Only!2026')
      const managerList = await api(manager, root + '/timesheet?month=2026-10')
      assert.equal(managerList.status, 200)
      assert.equal(managerList.body.meta.worktime_writes_enabled, false)
      assert.equal((await api(manager, root + '/timesheet/' + employee, 'PUT', {
        month: '2026-10',
        days: [{ date: '2026-10-15', worked_minutes: 480,
          absence_minutes: 0, overtime_minutes: 0, revision: null }],
      })).status, 403)
    } finally {
      await browser.close()
    }
  })
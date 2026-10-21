import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const employeeURL = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('employee schedule ZIP: month-scoped read-only facts and no fabricated lateness across viewports', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(employeeURL)
      const nav = page.getByRole('navigation', { name: 'Разделы карточки сотрудника' })
      await nav.waitFor()
      await nav.getByRole('button', { name: 'График и табель' }).click()
      const panel = page.locator('.employee-month-worktime')
      await panel.waitFor()
      await panel.getByLabel('Период').fill('2026-10')
      const table = panel.getByRole('table', { name: 'Фактически записанные дни табеля' })
      await table.waitFor()
      assert.equal(await table.locator('tbody tr').count(), 5)
      const kpis = panel.locator('.employee-month-metric')
      assert.equal(await kpis.count(), 4)
      assert.ok((await kpis.filter({ hasText: 'Явки' }).innerText()).includes('4'))
      assert.ok((await kpis.filter({ hasText: 'Сверхурочные' }).innerText()).includes('2'))
      assert.ok((await kpis.filter({ hasText: 'Отсутствия' }).innerText()).includes('9'))
      const late = await panel.locator('[data-metric="late"]').innerText()
      assert.ok(late.includes('—') && !late.includes('0 ч'),
        'Unrecorded lateness must never become an invented zero')
      assert.equal(await panel.locator('input').count(), 1, 'Only the month selector is interactive')
      assert.equal(await panel.getByText('Только просмотр').count(), 1)
      assert.equal(await panel.locator('button[aria-label*="Изменить"]').count(), 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
        false, 'No page-level horizontal overflow at ' + width)
      assert.deepEqual(errors, [])
    } finally { await context.close() }
  }
})

test('synthetic demo returns a blank month without pretending missing entries are zero', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const { mockApiRequest } = await import('/src/mocks/mockApi.ts')
      return mockApiRequest('/companies/11111111-1111-4111-8111-111111111111/worktime/employees/00000000-0000-4000-8000-000000001001/monthly-summary?month=2026-10')
    })
    assert.equal(result.data.summary.days_recorded, 0)
    assert.equal(result.data.summary.present_days, null)
    assert.equal(result.data.summary.overtime_minutes, null)
    assert.equal(result.data.summary.lateness_minutes, null)
    assert.deepEqual(result.data.days, [])
  } finally { await context.close() }
})

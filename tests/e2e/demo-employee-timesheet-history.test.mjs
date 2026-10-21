import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const employeeURL = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('ZIP history shows recorded Laravel-compatible months, read-only and responsive', async () => {
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
      const history = page.locator('.employee-timesheet-history')
      await history.waitFor()
      await history.locator('select').selectOption('2026')
      const table = history.getByRole('table', { name: 'История табелей сотрудника' })
      await table.waitFor()
      assert.ok((await table.locator('tbody tr').count()) >= 1)
      assert.equal(await history.getByText('Только просмотр').count(), 1)
      assert.equal(await history.getByRole('button', { name: 'Изменить' }).count(), 0)
      assert.ok((await history.innerText()).includes('Ночные часы'))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

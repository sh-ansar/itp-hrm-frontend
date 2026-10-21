import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })
const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const employeeURL = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'

test('ZIP family and military projection stays clear, authorized and responsive', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(employeeURL)
      await page.getByRole('navigation', { name: 'Разделы карточки сотрудника' }).waitFor()
      const section = heading => page.locator('.employee-profile-section')
        .filter({ has: page.getByRole('heading', { name: heading, exact: true }) })
      const family = section('Семейные данные')
      await family.waitFor()
      assert.equal(await family.locator('.employee-family-row').count(), 2)
      assert.equal(await family.locator('.employee-data-label').getByText('Семейное положение', { exact: true }).count(), 1)
      assert.equal(await family.locator('.employee-family-row').first().locator('.employee-family-field').count(), 3)
      const firstLabels = await family.locator('.employee-family-row').first()
        .locator('.employee-family-field > span').allTextContents()
      assert.deepEqual(firstLabels, ['Степень родства', 'ФИО', 'Дата рождения / Возраст'])
      const familyEvidence = family.locator('.employee-family-evidence')
      assert.equal(await familyEvidence.count(), 2)
      assert.equal(await familyEvidence.locator('a').count(), 0,
        'Free-form document references must not be presented as fake download links')

      const military = section('Воинский учёт')
      await military.waitFor()
      const militaryComment = military.locator('.employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText('Общий комментарий', { exact: true }),
      })
      assert.equal(await militaryComment.getAttribute('data-field-state'), 'informative')
      assert.equal(await militaryComment.locator('input,textarea').count(), 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false,
        'Family and military UI overflow at ' + width)
      assert.deepEqual(errors, [])
    } finally { await context.close() }
  }
})

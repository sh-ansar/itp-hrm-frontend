import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const url = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('ZIP family section displays native informative records without misleading input controls', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(url)
      await page.getByRole('navigation', { name: 'Разделы карточки сотрудника' }).waitFor()
      const familySection = page.locator('.employee-profile-section')
        .filter({ has: page.getByRole('heading', { name: 'Семейные данные', exact: true }) })
      const marital = familySection.locator('.employee-data-field')
        .filter({ has: page.locator('.employee-data-label').getByText('Семейное положение', { exact: true }) })
      await marital.waitFor()
      assert.equal(await marital.getAttribute('data-field-state'), 'informative',
        'Read-only users may view marital status without editing it')
      assert.equal(await marital.locator('button,input,select').count(), 0)
      const list = page.locator('.employee-family-list')
      await list.waitFor()
      assert.equal(await list.locator('.employee-family-entry').count(), 2)
      assert.equal(await list.getByRole('listitem').count(), 2)
      await list.getByText('Садыкова Алия Сериковна', { exact: true }).waitFor()
      await list.getByText('Садыков Тимур Арманович', { exact: true }).waitFor()
      assert.equal(await list.locator('input,select,textarea').count(), 0,
        'Informative family records must not be drawn as disabled input fields')
      assert.equal(await list.getByRole('button').count(), 0,
        'An isolated demo read projection must not pretend real HR edits are available')
      assert.equal(await list.getByRole('link').count(), 0,
        'Document references are informational text, not fabricated download links')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

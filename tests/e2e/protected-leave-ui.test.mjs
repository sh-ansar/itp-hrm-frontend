import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const admin = 'synthetic-bonus-approver@example.test'
const password = 'SyntheticBonusApproval-Only!2026'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('admin creates a protected leave category; old ordinary quotas are never applied', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 840 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(admin)
    await page.locator('input[type="password"]').fill(password)
    await page.locator('form button[type="submit"]').click()
    await page.getByRole('heading', { name: /Главная/ }).waitFor()
    await page.goto('/leaves')

    const open = page.getByRole('button', { name: 'Управление отпусками' })
    await open.waitFor()
    await open.click()
    const panel = page.locator('.leave-management')
    await panel.waitFor()
    await panel.getByRole('button', { name: 'Добавить вид отпуска' }).click()
    const drawer = page.getByRole('dialog', { name: 'Добавить вид отпуска' })
    await drawer.waitFor()
    await drawer.getByLabel('Категория отсутствия').selectOption('childcare')
    assert.equal(await drawer.locator('input[type="number"]').isDisabled(), true)
    const inputs = drawer.locator('input[type="text"]')
    await inputs.nth(0).fill('protected_childcare_e2e')
    await inputs.nth(1).fill('Protected childcare test')
    await drawer.getByRole('button', { name: 'Добавить вид отпуска' }).click()
    await drawer.waitFor({ state: 'hidden' })

    const getRecord = () => page.evaluate(async cid => {
      const result = await fetch('/api/v1/companies/' + cid + '/leave-types', {
        headers: { Accept: 'application/json' }, credentials: 'same-origin',
      })
      const data = await result.json()
      return {
        status: result.status,
        supported: data.meta?.supported_categories,
        record: data.data?.find(row => row.code === 'protected_childcare_e2e'),
      }
    }, company)
    const created = await getRecord()
    assert.equal(created.status, 200)
    assert.equal(created.record?.category, 'childcare')
    assert.equal(created.record?.balance_method, 'calendar_days')
    assert.equal(created.record?.annual_days, null)
    assert.ok(created.supported.includes('childcare'))

    await page.reload()
    const afterReload = await getRecord()
    assert.equal(afterReload.record?.id, created.record?.id)
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

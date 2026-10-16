import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const company = '11111111-1111-4111-8111-111111111111'
test('admin bulk edits existing calendar dates, saves revisions and reloads at mobile width', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 900 } })
  await context.addInitScript(() => localStorage.setItem('hrm-theme', 'dark'))
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-bonus-approver@example.test')
    await page.getByLabel('Пароль').fill('SyntheticBonusApproval-Only!2026')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
    await page.goto('/timesheets')
    await page.locator('input[type="month"]').fill('2026-10')
    await page.getByRole('button', { name: 'Производственный календарь', exact: true }).click()
    await page.getByRole('button', { name: 'Редактировать календарь', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Редактор производственного календаря' })
    await drawer.locator('summary').filter({ hasText: 'Массовое изменение дат' }).click()
    await drawer.getByLabel('Период с', { exact: true }).fill('2026-10-12')
    await drawer.getByLabel('Период по', { exact: true }).fill('2026-10-14')
    await drawer.getByRole('combobox', { name: 'Тип дней периода' }).selectOption('holiday')
    await drawer.getByLabel('Описание для периода').fill('Synthetic three-day holiday')
    assert.equal(await drawer.getByLabel('Минуты в рабочий день').isDisabled(), true)
    await drawer.getByRole('button', { name: 'Применить к периоду', exact: true }).click()
    assert.equal(await drawer.locator('.calendar-editor-day.dirty.holiday').count(), 3)
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/worktime/calendar') && r.request().method() === 'PUT'),
      drawer.getByRole('button', { name: 'Сохранить изменения', exact: true }).click(),
    ])
    assert.equal(response.status(), 200)
    assert.equal(response.request().postDataJSON().days.length, 3)
    await page.reload()
    await page.locator('input[type="month"]').fill('2026-10')
    await page.getByRole('button', { name: 'Производственный календарь', exact: true }).click()
    await page.getByRole('button', { name: 'Редактировать календарь', exact: true }).click()
    await drawer.locator('summary').click()
    // Invalid/out-of-month ranges cannot modify the draft.
    await drawer.getByLabel('Период с', { exact: true }).fill('2026-09-30')
    assert.equal(await drawer.getByRole('button', { name: 'Применить к периоду', exact: true }).isDisabled(), true)
    const result = await page.evaluate(async company => {
      const r = await fetch(`/api/v1/companies/${company}/worktime/calendar?month=2026-10`)
      return { status: r.status, body: await r.json() }
    }, company)
    assert.equal(result.status, 200)
    for (const date of ['2026-10-12', '2026-10-13', '2026-10-14']) {
      const day = result.body.data.find(day => day.date === date)
      assert.equal(day.day_type, 'holiday')
      assert.equal(day.planned_minutes, 0)
      assert.equal(day.label, 'Synthetic three-day holiday')
      assert.equal(day.revision, 2)
      assert.equal(await drawer.getByRole('button', { name: date + ' – Праздничный день', exact: true }).isVisible(), true)
    }
    assert.equal(result.body.data.find(day => day.date === '2026-10-15').revision, 1)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  } finally { await browser.close() }
})

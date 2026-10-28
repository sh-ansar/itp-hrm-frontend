import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const company = '11111111-1111-4111-8111-111111111111'

test('admin edits selected calendar days inline across month and quarter and saves revision', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 900 },
  })
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
    const editor = page.getByRole('region', { name: 'Редактирование календаря без боковой панели' })
    await editor.waitFor()
    assert.equal(await page.getByRole('dialog', { name: 'Редактор производственного календаря' }).count(), 0)
    const dates = ['2026-10-12', '2026-10-13', '2026-10-14']
    for (const date of dates) {
      await editor.locator('[data-calendar-date="' + date + '"]').click()
      assert.equal(await editor.locator('[data-calendar-date="' + date + '"]').getAttribute('aria-pressed'), 'true')
    }
    await editor.getByRole('combobox', { name: 'Тип дня' }).selectOption('holiday')
    await editor.getByRole('button', { name: 'Применить', exact: true }).click()
    assert.equal(await editor.locator('.calendar-inline-day--changed.calendar-inline-day--holiday').count(), 3)
    const saveButton = editor.getByRole('button', { name: 'Сохранить изменения', exact: true })
    assert.ok(await saveButton.isVisible())
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/worktime/calendar') && r.request().method() === 'PUT'),
      saveButton.click(),
    ])
    assert.equal(response.status(), 200)
    assert.equal(response.request().postDataJSON().days.length, 3)

    await page.reload()
    await page.locator('input[type="month"]').fill('2026-10')
    await page.getByRole('button', { name: 'Производственный календарь', exact: true }).click()
    await page.getByRole('tab', { name: 'Квартал' }).click()
    // Quarter view is expanded by default and allows direct month drill-down.
    const monthTitle = page.getByRole('button', { name: /Открыть октябрь 2026 г/i })
    await monthTitle.waitFor()
    await page.getByRole('button', { name: 'Редактировать календарь', exact: true }).click()
    await editor.waitFor()
    await editor.locator('.calendar-inline-month').first().waitFor()
    assert.equal(await editor.locator('.calendar-inline-month').count(), 3)
    for (const date of dates) {
      const day = editor.locator('[data-calendar-date="' + date + '"]')
      await day.waitFor()
      assert.ok((await day.getAttribute('class')).includes('calendar-inline-day--holiday'))
    }
    await editor.getByRole('button', { name: 'Отмена', exact: true }).click()

    await page.getByRole('tab', { name: 'Год' }).click()
    await page.getByRole('button', { name: /Открыть октябрь 2026 г/i }).waitFor()
    assert.equal(await page.locator('.calendar-period-month').count(), 12)
    assert.equal(await page.locator('.calendar-month-toggle').count(), 0)
    const result = await page.evaluate(async id => {
      const r = await fetch('/api/v1/companies/' + id + '/worktime/calendar?month=2026-10')
      return { status: r.status, body: await r.json() }
    }, company)
    assert.equal(result.status, 200)
    for (const date of dates) {
      const day = result.body.data.find(value => value.date === date)
      assert.equal(day.day_type, 'holiday')
      assert.equal(day.planned_minutes, 0)
      assert.equal(day.revision, 2)
    }
    assert.equal(result.body.data.find(day => day.date === '2026-10-15').revision, 1)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  } finally { await browser.close() }
})

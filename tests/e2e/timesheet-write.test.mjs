import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
const email = 'synthetic-e2e@example.test'
const password = 'SyntheticE2E-Only!2026'

let browser

before(async () => {
  browser = await chromium.launch({ headless: true })
})

after(async () => {
  await browser?.close()
})

async function signIn(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(password)
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Войти' }).click(),
  ])
  assert.equal(response.status(), 200)
}

test('HR specialist edits a daily timesheet through the real UI and data survives reload', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  try {
    await signIn(page)
    await page.goto('/timesheets')
    await page.getByRole('heading', { name: 'Графики и табель' }).waitFor()

    const month = page.locator('input[type="month"]')
    await month.fill('2026-10')

    const row = page.getByRole('row').filter({ hasText: 'Synthetic Employee' })
    await row.waitFor()
    await row.getByRole('button', { name: 'Заполнить' }).click()

    const drawer = page.getByRole('dialog', { name: 'Табель сотрудника' })
    await drawer.waitFor()
    await drawer.getByRole('button', { name: 'Заполнить по плану' }).click()

    const targetDay = drawer.locator('.day-row').filter({ hasText: '15.10' })
    await targetDay.getByLabel('Отработано, ч').fill('6')
    await targetDay.getByLabel('Неявка, ч').fill('2')
    await targetDay.getByLabel('Сверхурочно, ч').fill('1')

    const [saveResponse] = await Promise.all([
      page.waitForResponse(r =>
        r.url().includes('/worktime/timesheet/77777777-7777-4777-8777-777777777777')
        && r.request().method() === 'PUT'),
      drawer.getByRole('button', { name: 'Сохранить табель' }).click(),
    ])
    assert.equal(saveResponse.status(), 200)
    await drawer.getByText('Табель сохранён.').waitFor()

    await drawer.getByRole('button', { name: 'Закрыть' }).click()
    await row.getByText('Требует внимания').waitFor()

    await page.reload()
    await page.getByRole('heading', { name: 'Графики и табель' }).waitFor()
    await page.locator('input[type="month"]').fill('2026-10')
    const reloaded = page.getByRole('row').filter({ hasText: 'Synthetic Employee' })
    await reloaded.waitFor()
    await reloaded.getByRole('button', { name: 'Заполнить' }).click()

    const reopened = page.getByRole('dialog', { name: 'Табель сотрудника' })
    await reopened.waitFor()
    const savedDay = reopened.locator('.day-row').filter({ hasText: '15.10' })
    assert.equal(await savedDay.getByLabel('Отработано, ч').inputValue(), '6')
    assert.equal(await savedDay.getByLabel('Неявка, ч').inputValue(), '2')
    assert.equal(await savedDay.getByLabel('Сверхурочно, ч').inputValue(), '1')

    const api = await page.evaluate(async () => {
      const response = await fetch('/api/v1/companies/11111111-1111-4111-8111-111111111111/worktime/timesheet?month=2026-10&per_page=100', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.json() }
    })
    assert.equal(api.status, 200)
    assert.equal(api.body.data[0].worked_minutes, 10440)
    assert.equal(api.body.data[0].absence_minutes, 120)
    assert.equal(api.body.data[0].overtime_minutes, 60)
    assert.equal(api.body.data[0].status, 'attention')
  } finally {
    await context.close()
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('connected HR frontend uses server capabilities, hides demo role matrix and blocks direct routes', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()

    const access = await page.evaluate(async () => {
      const response = await fetch('/api/v1/me/access', { credentials: 'same-origin',
        headers: { Accept: 'application/json' } })
      return { status: response.status, body: await response.json() }
    })
    assert.equal(access.status, 200)
    assert.equal(access.body.meta.source, 'server')
    assert.equal(access.body.meta.schema_version, 1)
    const company = access.body.data.companies[0]
    assert.ok(company?.company_id)
    assert.equal(company.role_code, 'hr_specialist')
    assert.equal(company.capabilities['employees.view'], true)
    assert.equal(company.capabilities['roles.interface'], false)
    assert.equal(company.capabilities['reports.view'], true)
    assert.equal(company.capabilities['worktime.calendar.edit'], false)

    const menu = page.getByRole('navigation', { name: 'Главная навигация' })
    assert.equal(await menu.getByRole('link', { name: 'Сотрудники' }).count(), 1)
    assert.equal(await menu.getByRole('link', { name: 'Роли и права' }).count(), 0)
    assert.equal(await menu.getByRole('link', { name: 'Отчёты и аналитика' }).count(), 1)
    await page.goto('/roles')
    await page.getByRole('heading', { name: 'Доступ ограничен' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/access-denied')

    await page.goto('/reports')
    await page.waitForURL(/\/reports$/)
    await page.locator('.reports-page').waitFor()
    await page.getByRole('button', { name: 'Сводка', exact: true }).waitFor()
    await page.goto('/employees')
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    assert.equal(await page.getByRole('searchbox', { name: 'Поиск сотрудника' }).count(), 1)
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})

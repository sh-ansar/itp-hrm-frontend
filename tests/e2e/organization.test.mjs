import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('organization page displays authorized company and department only', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Обзор системы' }).waitFor()
    await page.goto('/organization')
    await page.getByRole('heading', { name: 'Организационная структура' }).waitFor()
    const select = page.getByLabel('Компания')
    await select.waitFor()
    assert.match(await select.textContent(), /Test Company Visible/)
    assert.doesNotMatch(await select.textContent(), /Test Company Hidden/)
    await page.getByRole('cell', { name: /Visible Finance/ }).waitFor()
    assert.equal(await page.getByText('Hidden Department').count(), 0)
    const childRow = page.getByRole('row', { name: /Visible Finance Child/ })
    await childRow.waitFor()
    assert.match(await childRow.textContent(), /Visible Finance/)
    assert.match(await childRow.locator('td').first().textContent(), /↳/)
    assert.equal(await page.getByText('Родитель вне текущего списка').count(), 0)
    const unauthorized = await page.evaluate(async () => {
      const result = await fetch('/api/v1/companies/22222222-2222-4222-8222-222222222222/departments',
        { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      return result.status
    })
    assert.equal(unauthorized, 403)
  } finally { await context.close() }
})

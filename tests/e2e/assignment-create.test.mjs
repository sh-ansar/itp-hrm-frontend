import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HR creates a non-overlapping assignment from the employee card at mobile width', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()

  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Обзор системы' }).waitFor()

    await page.goto('/employees')
    await page.getByRole('row', { name: /E2E-001/ }).getByRole('link', { name: 'Открыть' }).click()
    await page.getByRole('heading', { name: 'Карточка сотрудника' }).waitFor()

    const form = page.getByRole('region', { name: 'Новое назначение' })
    await form.waitFor()
    await form.getByLabel('Подразделение').selectOption('33333333-3333-4333-8333-333333333333')
    await form.getByLabel('Должность').selectOption('66666666-6666-4666-8666-666666666666')
    await form.getByLabel('Действует с').fill('2025-01-01')
    await form.getByLabel('Действует по').fill('2025-12-31')
    await form.getByLabel('Основание').fill('Приказ E2E-15')
    await form.getByRole('button', { name: 'Добавить назначение' }).click()

    const table = page.getByRole('table', { name: 'Доступная история назначений' })
    const row = table.getByRole('row', { name: /Приказ E2E-15/ })
    await row.waitFor()
    assert.match(await row.innerText(), /Visible Finance/)
    assert.match(await row.innerText(), /Test Engineer/)
    assert.match(await row.innerText(), /2025-01-01/)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HR creates edits and atomically transfers assignments at mobile width', async () => {
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
    await page.getByRole('heading', { name: 'Главная' }).waitFor()

    await page.goto('/employees')
    await page.locator('.employee-mobile-card').filter({ hasText: 'E2E-001' }).getByRole('link', { name: /Открыть карточку/ }).click()
    await page.locator('.employee-page-heading h1').waitFor()
    await page.getByRole('navigation', { name: 'Разделы карточки сотрудника' }).getByRole('button', { name: 'Трудовые данные' }).click()

    await page.getByRole('button', { name: 'Добавить назначение' }).click()
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
    assert.match(await row.innerText(), /01\.01\.2025/)

    await row.getByRole('button', { name: 'Изменить' }).click()
    const editor = page.getByRole('region', { name: 'Редактирование назначения' })
    await editor.waitFor()
    await editor.getByLabel('Основание').fill('Приказ E2E-15-updated')
    await editor.getByRole('button', { name: 'Сохранить изменения' }).click()
    await table.getByRole('row', { name: /Приказ E2E-15-updated/ }).waitFor()

    const activeRow = table.getByRole('row', { name: /По настоящее время/ })
    await activeRow.getByRole('button', { name: 'Перевести' }).click()
    const transfer = page.getByRole('region', { name: 'Перевод сотрудника' })
    await transfer.waitFor()
    await transfer.getByLabel('Новое подразделение').selectOption('55555555-5555-4555-8555-555555555555')
    await transfer.getByLabel('Новая должность').selectOption('66666666-6666-4666-8666-666666666666')
    await transfer.getByLabel('Новое назначение с').fill('2026-07-01')
    await transfer.getByLabel('Основание').fill('Приказ E2E-transfer')
    await transfer.getByRole('button', { name: 'Выполнить перевод' }).click()

    const transferred = table.getByRole('row', { name: /Приказ E2E-transfer/ })
    await transferred.waitFor()
    assert.match(await transferred.innerText(), /Visible Finance Child/)
    const closedPrevious = table.getByRole('row', { name: /30\.06\.2026/ })
    await closedPrevious.waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

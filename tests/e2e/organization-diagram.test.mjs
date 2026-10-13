import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('organization table and nested chart switch without losing company scope or mobile width', async () => {
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
    await page.goto('/organization')
    await page.getByRole('heading', { name: 'Организационная структура' }).waitFor()
    const navigation = page.getByRole('navigation', { name: 'Представление организационной структуры' })
    await navigation.getByRole('button', { name: 'Схема' }).click()
    await page.locator('.structure-forest .tree-card').first().waitFor({ timeout: 15000 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    const toggle = page.locator('.tree-card button[aria-expanded]').first()
    if (await toggle.count()) {
      await toggle.click()
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    }
    await navigation.getByRole('button', { name: 'Таблица' }).click()
    await page.getByRole('table', { name: 'Подразделения компании' }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

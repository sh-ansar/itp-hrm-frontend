import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

test('directory search uses shared compact toolbar on desktop and mobile without changing company data', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width, height: 850 } })
      const page = await context.newPage()
      try {
        await page.goto('/login')
        await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
        await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
        await page.getByRole('button', { name: 'Войти' }).click()
        await page.getByRole('heading', { name: 'Главная' }).waitFor()
        await page.goto('/directories')
        await page.getByRole('heading', { name: 'Справочники', exact: true }).waitFor()
        const search = page.getByRole('searchbox', { name: 'Поиск должностей' })
        await search.waitFor()
        await search.fill('___NO_SUCH_QA_POSITION___')
        await page.getByText('0 из', { exact: false }).first().waitFor()
        if (width <= 700) await page.getByText('Должностей по запросу не найдено.').waitFor()
        await page.getByRole('button', { name: 'Сбросить поиск' }).click()
        assert.equal(await search.inputValue(), '')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
})

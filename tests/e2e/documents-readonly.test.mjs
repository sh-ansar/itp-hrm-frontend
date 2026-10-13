import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('documents register remains readable without offering write actions', async () => {
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

    await page.goto('/documents')
    await page.getByRole('heading', { name: 'Документы и приказы', level: 1 }).waitFor()
    await page.locator('.document-mobile-list').getByText('Документы не найдены.').waitFor({ timeout: 15000 })
    assert.equal(await page.getByRole('button', { name: 'Новый черновик' }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Прикрепить PDF' }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

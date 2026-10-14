import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('employee profile sections scroll horizontally only and remain operable at four breakpoints', async () => {
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
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
    await page.goto('/employees')
    await page.locator('.employee-mobile-card').filter({ hasText: 'E2E-001' })
      .getByRole('link', { name: /Открыть карточку/ }).click()
    await page.locator('.employee-page-heading h1').waitFor()

    const nav = page.getByRole('navigation', { name: 'Разделы карточки сотрудника' })
    const laborTab = nav.getByRole('button', { name: 'Трудовые данные' })
    for (const width of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await laborTab.click()
      assert.equal(await laborTab.getAttribute('aria-current'), 'page')
      await page.getByText('Договор и приём').waitFor()

      const dimensions = await page.locator('.employee-profile .view-tabs').evaluate(el => ({
        overflowX: getComputedStyle(el).overflowX,
        overflowY: getComputedStyle(el).overflowY,
        content: el.scrollWidth,
        viewport: el.clientWidth,
      }))
      assert.equal(dimensions.overflowX, 'auto', 'tab row must scroll horizontally when necessary')
      assert.equal(dimensions.overflowY, 'hidden', 'tab row must not scroll vertically')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert.ok(overflow <= 1, `profile overflows document at ${width}px by ${overflow}px`)

      const development = nav.getByRole('button', { name: 'Кадровый резерв и обучение' })
      if (await development.count()) {
        await development.click()
        assert.equal(await development.getAttribute('aria-current'), 'page')
      }
    }
  } finally {
    await context.close()
  }
})

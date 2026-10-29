import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

test('employee and directory action menus remain anchored and compact at mobile/desktop widths', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [375, 768, 1280, 1440]) {
      const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:5173', viewport: { width, height: 900 },
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', cause => errors.push(cause.message))
      try {
        await page.goto('/employees')
        const button = page.getByRole('button', { name: 'Экспорт', exact: true })
        await button.waitFor()
        await button.click()
        const menu = page.getByRole('menu', { name: 'Экспорт' })
        await menu.waitFor()
        const bounds = await menu.boundingBox()
        assert.ok(bounds, 'Export menu has a bounding box')
        assert.ok(bounds.width <= 281, 'Menu must never expand to viewport width: ' + bounds.width)
        assert.ok(bounds.x >= 10 && bounds.x + bounds.width <= width - 8, 'Menu must fit the viewport')
        const trigger = await button.boundingBox()
        assert.ok(Math.abs(bounds.x + bounds.width - trigger.x - trigger.width) < 25 ||
          bounds.x === 12, 'Menu should be aligned with export control')
        await page.keyboard.press('Escape')
        await menu.waitFor({ state: 'hidden' })
        await button.click()
        await page.locator('main#main-content').click({ position: { x: 12, y: 20 } })
        await menu.waitFor({ state: 'hidden' })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
        assert.deepEqual(errors, [])
      } finally { await context.close() }
    }
  } finally { await browser.close() }
})

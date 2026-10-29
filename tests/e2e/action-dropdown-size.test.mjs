import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const origin = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'

test('action dropdown is only as wide as its content and stays next to its trigger at 375 and 1440', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [375, 768, 1440]) {
      const context = await browser.newContext({ baseURL: origin, viewport: { width, height: 850 } })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      try {
        await page.goto('/login')
        await page.getByLabel('Электронная почта').fill('synthetic-bonus-approver@example.test')
        await page.getByLabel('Пароль').fill('SyntheticBonusApproval-Only!2026')
        await page.getByRole('button', { name: 'Войти', exact: true }).click()
        await page.waitForURL(url => !url.pathname.endsWith('/login'))
        await page.goto('/employees')
        const trigger = page.locator('.action-dropdown').filter({
          has: page.getByRole('button', { name: 'Экспорт', exact: true }),
        }).locator('button.action-trigger').first()
        await trigger.waitFor()
        await trigger.click()
        const menu = page.getByRole('menu', { name: 'Экспорт' })
        await menu.waitFor()
        const bounds = await page.evaluate(() => {
          const anchor = [...document.querySelectorAll('button.action-trigger')].find(node =>
            node.getAttribute('aria-label') === 'Экспорт')
          const menu = [...document.querySelectorAll('[role="menu"]')].find(node =>
            node.getAttribute('aria-label') === 'Экспорт')
          if (!anchor || !menu) return null
          const triggerRect = anchor.getBoundingClientRect()
          const menuRect = menu.getBoundingClientRect()
          return {
            viewport: innerWidth, width: menuRect.width, left: menuRect.left,
            right: menuRect.right, top: menuRect.top,
            anchorLeft: triggerRect.left, anchorRight: triggerRect.right,
            documentWidth: document.documentElement.scrollWidth,
          }
        })
        assert.ok(bounds, 'Both trigger and menu exist')
        assert.ok(bounds.width >= 195 && bounds.width <= 300,
          'Menu width must fit content, not body width: ' + JSON.stringify(bounds))
        assert.ok(bounds.left >= 10 && bounds.right <= width - 10,
          'Menu must stay inside viewport: ' + JSON.stringify(bounds))
        assert.ok(Math.abs(bounds.right - bounds.anchorRight) <= Math.max(8, 300 - bounds.anchorRight),
          'Menu must be anchored near the trigger: ' + JSON.stringify(bounds))
        assert.ok(bounds.documentWidth <= width + 1, 'No horizontal document overflow')
        await page.keyboard.press('Escape')
        await menu.waitFor({ state: 'hidden' })
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
        assert.deepEqual(errors, [])
      } finally { await context.close() }
    }
  } finally { await browser.close() }
})

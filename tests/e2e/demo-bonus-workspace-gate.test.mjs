import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser?.close() })

test('bonus workspace is transparent about unavailable writes in Vercel demo across languages, themes and widths', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    const bonusRequests = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      if (request.url().includes('/api/v1/companies/') && request.url().includes('/bonuses')) {
        bonusRequests.push(request.url())
      }
    })
    try {
      await page.goto('/personnel-actions')
      await page.locator('.view-tabs button').last().click()
      assert.equal(await page.locator('.bonus-panel').count(), 1)
      assert.equal(await page.locator('.bonus-panel button').count(), 0, 'Demo must not offer a fake create action')

      const expected = {
        ru: 'Функция премирования будет доступна',
        kk: 'Сыйақы функциясы',
        en: 'Bonus proposals will be available',
        ka: 'პრემიების მართვა',
      }
      for (const [locale, label] of Object.entries(expected)) {
        await page.locator('.locale-control select').selectOption(locale)
        await page.getByText(label, { exact: false }).first().waitFor()
        assert.equal(await page.locator('.bonus-panel button').count(), 0)
      }

      await page.locator('button.theme-toggle').click()
      await page.waitForTimeout(300)
      const metrics = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        filter: getComputedStyle(document.documentElement).filter,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      }))
      assert.equal(metrics.theme, 'dark')
      assert.equal(metrics.filter, 'none')
      assert.ok(metrics.overflow <= 1, 'Overflow at '+width+': '+metrics.overflow)
      assert.ok((await page.screenshot()).byteLength > 20000, 'Blank screenshot at '+width)
      assert.deepEqual(bonusRequests, [], 'Demo must not issue real protected salary/bonus requests')
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

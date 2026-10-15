import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('production calendar uses distinct work / weekend / holiday cell fills on every viewport and theme', async () => {
  for (const width of [375, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      try {
        await page.goto('/timesheets')
        await page.locator('input[type="month"]').fill('2026-10')
        await page.getByRole('button', { name: 'Производственный календарь', exact: true }).click()
        await page.locator('.calendar-day--holiday').waitFor()
        if (theme === 'dark') {
          await page.locator('button.theme-toggle').click()
          await page.waitForTimeout(300)
        }
        const calendar = await page.evaluate(() => {
          const colors = {}
          const types = ['workday', 'weekend', 'holiday']
          for (const type of types) {
            const cell = document.querySelector('.calendar-day--' + type)
            if (!cell) throw Error('Missing '+type+' example cell')
            const style = getComputedStyle(cell)
            colors[type] = { background: style.backgroundColor, foreground: style.color }
          }
          return {
            colors,
            count: document.querySelectorAll('.calendar-day').length,
            holidayDate: document.querySelector('.calendar-day--holiday')?.getAttribute('aria-label'),
            theme: document.documentElement.dataset.theme,
            filter: getComputedStyle(document.documentElement).filter,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
            legend: [...document.querySelectorAll('.calendar-legend [role=listitem]')].map(el => el.textContent.trim()),
          }
        })
        assert.equal(calendar.theme, theme)
        assert.equal(calendar.filter, 'none', 'Root must never be filtered')
        assert.equal(calendar.count, 31)
        assert.match(calendar.holidayDate, /2026-10-25/)
        assert.match(calendar.holidayDate, /День Республики/)
        assert.equal(calendar.legend.length, 3)
        assert.equal(new Set(Object.values(calendar.colors).map(c => c.background)).size, 3,
          'Calendar cells must have three distinct fills: ' + JSON.stringify(calendar.colors))
        for (const [type, color] of Object.entries(calendar.colors)) {
          assert.notEqual(color.background, 'rgba(0, 0, 0, 0)', type + ' cell is transparent')
          assert.notEqual(color.background, 'rgb(255, 255, 255)', type + ' cell not filled')
          assert.notEqual(color.foreground, color.background, type + ' text invisible')
        }
        assert.ok(calendar.overflow <= 1, 'Calendar viewport overflow at '+width+': '+calendar.overflow)
        assert.ok((await page.screenshot()).byteLength > 20000, 'Calendar screenshot blank')
        assert.deepEqual(errors, [], 'Browser errors at '+width+'/'+theme)
      } finally {
        await context.close()
      }
    }
  }
})

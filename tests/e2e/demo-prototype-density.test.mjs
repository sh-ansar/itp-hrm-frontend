import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })
const baseURL = 'http://127.0.0.1:5173'

test('employee KPI grid stays compact at intermediate desktop and mobile widths', async () => {
  for (const { width, expectedColumns } of [
    { width: 1180, expectedColumns: 4 },
    { width: 768, expectedColumns: 2 },
    { width: 375, expectedColumns: 2 },
  ]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    try {
      await page.goto('/employees')
      await page.locator('.register-title h1').waitFor()
      const cards = page.locator('.registry-metrics .registry-summary-card')
      assert.equal(await cards.count(), 4)
      const coords = await cards.evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect()
        return { x: Math.round(r.left), y: Math.round(r.top), width: r.width }
      }))
      const rows = new Set(coords.map(x => x.y))
      assert.equal(coords.length / rows.size, expectedColumns,
        'Expected ' + expectedColumns + ' KPI columns at viewport ' + width + ': ' + JSON.stringify(coords))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false, 'No page overflow at ' + width)
      if (width === 375) {
        const heading = page.getByRole('heading', { name: /Реестр сотрудников/ }).last()
        assert.ok((await heading.boundingBox()).y < 810,
          'Compact cards should keep the employee register near the first mobile viewport')
      }
    } finally { await context.close() }
  }
})

test('staffing date and action controls fit without clipping at 1180px', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1180, height: 820 } })
  const page = await context.newPage()
  try {
    await page.goto('/staffing')
    await page.getByRole('heading', { name: 'Штатное расписание', exact: true }).first().waitFor()
    const button = page.getByRole('button', { name: 'Показать на дату', exact: true })
    await button.waitFor()
    const box = await button.boundingBox()
    assert.ok(box && box.x >= 0 && box.x + box.width <= 1180,
      'Entire staffing date button must be visible in viewport: ' + JSON.stringify(box))
    assert.ok(await button.isVisible())
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally { await context.close() }
})

test('dark theme is neutral slate and custom select arrows are consistently styled', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  try {
    await page.goto('/employees')
    await page.getByRole('button', { name: 'Включить тёмную тему' }).click()
    const color = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    assert.equal(color, 'rgb(23, 27, 32)', 'Neutral dark theme must not be a navy screen')
    const selects = page.locator('.base-select-field')
    await selects.first().waitFor()
    const select = selects.first()
    assert.equal(await select.locator('select').evaluate(el => getComputedStyle(el).appearance), 'none')
    assert.equal(await select.locator('.base-select-chevron').count(), 1)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally { await context.close() }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

function rgb(color) {
  const channels = color.match(/[0-9.]+/g)?.slice(0, 3).map(Number)
  assert.equal(channels?.length, 3, 'Expected RGB computed color: ' + color)
  return channels
}
function luminance(color) {
  const channels = rgb(color).map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}
function ratio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}
async function contrast(page, selector) {
  return page.locator(selector).evaluate(element => {
    const style = getComputedStyle(element)
    return { color: style.color, background: style.backgroundColor }
  })
}

test('light and dark HRM workspaces retain readable text/background contrast', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 850 } })
  const page = await context.newPage()
  try {
    await page.goto('/')
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
    assert.equal(await page.locator('link[href="/boot-fallback.css"]').count(), 0,
      'Startup styling must not require a separately fetched fallback CSS file')
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Включить тёмную тему' }).click()
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme)
      const body = await contrast(page, 'body')
      const content = await contrast(page, 'main#main-content')
      assert.ok(ratio(body.color, body.background) >= 7,
        theme + ' body background/text mismatch: ' + JSON.stringify(body))
      assert.ok(ratio(body.color, content.background) >= 7,
        theme + ' content background/text mismatch: ' + JSON.stringify(content))
      // Regression: a scoped :global selector once compiled into a filter on :root,
      // turning the entire rendered HRM UI into a solid blue rectangle.
      const rootFilter = await page.evaluate(() => getComputedStyle(document.documentElement).filter)
      assert.equal(rootFilter, 'none', theme + ' must not apply an image filter to the full page')
      await page.waitForTimeout(250) // let theme transitions finish before comparing pixels
      const screenshot = await page.screenshot()
      assert.ok(screenshot.byteLength > 20000,
        theme + ' rendered viewport looks blank (PNG is only ' + screenshot.byteLength + ' bytes)')
    }
  } finally {
    await context.close()
  }
})

test('loading fallback stays visible even when application JavaScript is unavailable', async () => {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    try {
      await page.addInitScript(value => {
        document.documentElement.dataset.theme = value
      }, theme)
      await page.route('**/src/main.ts*', route => route.abort())
      await page.goto('/')
      const boot = page.locator('.boot-status__card')
      await boot.waitFor()
      assert.equal(await boot.isVisible(), true)
      assert.match(await boot.innerText(), /Загрузка кадровой системы/)
      const foreground = await contrast(page, '.boot-status')
      const surface = await contrast(page, '.boot-status__card')
      assert.ok(ratio(foreground.color, foreground.background) >= 7,
        theme + ' startup page is unreadable: ' + JSON.stringify(foreground))
      assert.ok(ratio(foreground.color, surface.background) >= 7,
        theme + ' startup card is unreadable: ' + JSON.stringify(surface))
    } finally {
      await context.close()
    }
  }
})

import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_HTDOCS_BASE_URL || 'http://127.0.0.1:4178'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HRM login sends its own XSRF token, never the platform cookie', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  let csrfRequested = false
  let loginHeader = null
  await context.addCookies([
    { name: 'XSRF-TOKEN', value: 'platform-only-token', url: baseURL },
    { name: 'HRM-XSRF-TOKEN', value: 'hrm-private-token', url: baseURL },
  ])
  await page.route('**/hrm-api/sanctum/csrf-cookie', route => {
    csrfRequested = true
    return route.fulfill({ status: 204 })
  })
  await page.route('**/hrm-api/auth/login', route => {
    loginHeader = route.request().headers()['x-xsrf-token']
    return route.fulfill({
      status: 422, contentType: 'application/json',
      body: '{"message":"Invalid test credentials"}',
    })
  })
  try {
    await page.goto('/hrm/login')
    await page.locator('input[type="email"]').fill('synthetic@example.test')
    await page.locator('input[type="password"]').fill('SyntheticOnly!123456')
    await page.locator('form button[type="submit"]').click()
    await page.waitForResponse(resp => new URL(resp.url()).pathname === '/hrm-api/auth/login')
    assert.equal(csrfRequested, true)
    assert.equal(loginHeader, 'hrm-private-token')
    assert.notEqual(loginHeader, 'platform-only-token')
  } finally {
    await context.close()
  }
})

import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_HTDOCS_BASE_URL || 'http://127.0.0.1:4177'
let browser

before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('static HRM build works under /hrm/ after direct navigation and refresh', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 812 } })
  const page = await context.newPage()
  const requests = []
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => {
    if (msg.type() === 'error' && !/401 \(Unauthorized\)/.test(msg.text())) errors.push('console: ' + msg.text())
  })
  page.on('response', response => {
    const pathname = new URL(response.url()).pathname
    if (response.status() >= 400 && !(response.status() === 401 && pathname.startsWith('/hrm-api/'))) {
      errors.push('HTTP ' + response.status() + ' ' + pathname)
    }
  })
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname
    requests.push(pathname)
  })
  // Production backend is deliberately absent in this static-only test.
  // All /hrm-api paths are handled as denied, without contacting shared /api.
  await page.route('**/hrm-api/**', route => route.fulfill({
    status: 401, contentType: 'application/json', body: '{"message":"Unauthenticated"}',
  }))
  try {
    await page.goto('/hrm/login', { waitUntil: 'networkidle' })
    assert.equal(await page.locator('input[type="email"]').count(), 1)
    assert.equal(await page.locator('input[type="password"]').count(), 1)
    const favicon = await page.locator('link[rel="icon"]').getAttribute('href')
    assert.equal(favicon, '/hrm/brand/itp-mark.svg')
    const iconResponse = await page.request.get(favicon)
    assert.equal(iconResponse.status(), 200)
    const fontsStylesheet = await page.request.get('/hrm/fonts.css')
    assert.equal(fontsStylesheet.status(), 200, 'The prefixed font declaration must load')
    const fontCss = await fontsStylesheet.text()
    assert.match(fontCss, /\.\/fonts\/GolosText\.ttf/, 'Font URL must be relative to /hrm/')
    const fontFile = await page.request.get('/hrm/fonts/GolosText.ttf')
    assert.equal(fontFile.status(), 200, 'The local Golos font must resolve under /hrm/')
    const fontReady = await page.evaluate(async () => {
      await document.fonts.ready
      return document.fonts.check('14px "Golos Text"')
    })
    assert.equal(fontReady, true, 'Golos font must be usable in /hrm/ after production build')
    const icon = await iconResponse.text()
    assert.match(icon, /viewBox="0 0 39 29"/)
    assert.match(icon, /fill="#0697E0"/)
    assert.equal(await page.locator('.login-brand__row img').evaluate(img => img.complete && img.naturalWidth > 0), true)
    assert.equal((await page.locator('.login-brand__row strong').innerText()).trim(), 'HRM')
    assert.ok(requests.some(path => path.startsWith('/hrm/assets/') && path.endsWith('.js')))
    assert.ok(requests.some(path => path.startsWith('/hrm/assets/') && path.endsWith('.css')))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)

    await page.goto('/hrm/employees', { waitUntil: 'networkidle' })
    await page.waitForURL(url => url.pathname === '/hrm/login')
    assert.match(new URL(page.url()).search, /redirect/)
    assert.ok(requests.includes('/hrm-api/auth/me'))
    assert.ok(!requests.some(path => path.startsWith('/api/') || path.startsWith('/auth/') || path.startsWith('/sanctum/')))

    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await page.locator('input[type="email"]').count(), 1)
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})

test('browser login is enabled only after a verified HRM API readiness response', async () => {
  for (const { response, allowed } of [
    { response: { status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', service: 'itp-hrm-api', capabilities: { browser_login: false } }) }, allowed: false },
    { response: { status: 200, contentType: 'text/html', body: '<!DOCTYPE html><html><body>Platform fallback</body></html>' }, allowed: false },
    { response: { status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', service: 'itp-hrm-api', capabilities: { browser_login: true } }) }, allowed: true },
  ]) {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    const attemptedLogins = []
    await page.route('**/hrm-api/**', route => {
      if (route.request().url().endsWith('/api/v1/health')) return route.fulfill(response)
      if (route.request().url().endsWith('/auth/login')) attemptedLogins.push('unexpected')
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Unauthenticated"}' })
    })
    try {
      await page.goto('/hrm/login', { waitUntil: 'networkidle' })
      const email = page.locator('input[type="email"]')
      const password = page.locator('input[type="password"]')
      const submit = page.locator('button[type="submit"]')
      const recovery = page.getByRole('button', { name: 'Забыли пароль?' })
      assert.equal(await recovery.isVisible(), true, 'recovery entry point must stay visible even before mail activation')
      if (!allowed) {
        await recovery.click()
        assert.equal(await page.getByRole('heading', { name: 'Сброс пароля' }).isVisible(), true)
        assert.equal(await page.getByText('Восстановление пароля временно недоступно. Попробуйте позднее.').isVisible(), true)
        await page.getByRole('button', { name: 'Закрыть' }).click()
      }
      assert.equal(await email.isDisabled(), !allowed)
      assert.equal(await password.isDisabled(), !allowed)
      assert.equal(await submit.isDisabled(), true)
      if (allowed) {
        await email.fill('synthetic@example.test')
        await password.fill('synthetic-only-not-a-real-credential')
        assert.equal(await submit.isEnabled(), true)
      }
      assert.deepEqual(attemptedLogins, [])
    } finally {
      await context.close()
    }
  }
})

test('all prototype SVG icons resolve under /hrm/ and never use root asset paths', async () => {
  const sources = []
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name)
      if (entry.isDirectory()) visit(fullPath)
      else if (/\.(?:vue|ts|css)$/.test(entry.name)) sources.push(readFileSync(fullPath, 'utf8'))
    }
  }
  visit(resolve('src'))

  const combined = sources.join('\n')
  assert.doesNotMatch(combined, /(?:\bsrc="|\bicon="|\bicon:\s*')\/prototype-icons\//)
  const names = [...new Set([...combined.matchAll(/prototype-icons\/([a-zA-Z0-9._-]+\.svg)/g)].map(match => match[1]))]
  assert.ok(names.length >= 12, 'Icon inventory should not be empty')

  const context = await browser.newContext({ baseURL })
  try {
    for (const name of names) {
      const response = await context.request.get('/hrm/prototype-icons/' + name)
      assert.equal(response.status(), 200, name)
      assert.match(response.headers()['content-type'] ?? '', /image\/svg\+xml/, name)
      assert.match(await response.text(), /<svg[\s>]/i, name)
    }
  } finally {
    await context.close()
  }
})

test('every HRM deep link is served by the frontend and never returns server 404', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  await page.route('**/hrm-api/**', route => route.fulfill({
    status: 401, contentType: 'application/json', body: '{"message":"Unauthenticated"}',
  }))
  try {
    for (const path of ['/hrm/organization', '/hrm/staffing', '/hrm/documents', '/hrm/leaves']) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      assert.equal(response.status(), 200, path)
      assert.match(await page.title(), /ITP HRM/)
    }
  } finally {
    await context.close()
  }
})


test('registry metric icons load in the real /hrm/ component without a second base prefix', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  const companyId = '11111111-1111-4111-8111-111111111111'
  // Only this isolated static-build test uses synthetic read responses.
  // Production continues to use authenticated Laravel APIs.
  await page.route('**/hrm-api/**', route => {
    const path = new URL(route.request().url()).pathname
    let body = { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: 25 } }
    if (path.endsWith('/auth/me')) body = { data: { id: 1, name: 'Synthetic Asset QA' } }
    else if (path.endsWith('/me/access')) body = {
      data: { companies: [{ company_id: companyId, company_name: 'Synthetic Company',
        role_code: 'company_admin', department_scopes: [], capabilities: {
          'employees.view': true, 'employees.extended_view': true,
          'organization.view': true, 'staffing.view': true,
          'roles.interface': true, 'settings.view': true,
        } }] }, meta: { schema_version: 1, source: 'server' },
    }
    else if (path.endsWith('/companies')) body = { data: [{ id: companyId, name: 'Synthetic Company' }], meta: { total: 1 } }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  try {
    for (const path of ['/hrm/employees', '/hrm/organization', '/hrm/roles']) {
      await page.goto(path, { waitUntil: 'networkidle' })
      const icons = page.locator('.registry-summary-card img')
      assert.equal(await icons.count(), 4, path + ' renders four metric icons')
      await page.waitForFunction(() => [...document.querySelectorAll('.registry-summary-card img')]
        .every(img => img.complete))
      for (const state of await icons.evaluateAll(images => images.map(img => ({
        src: img.getAttribute('src'), naturalWidth: img.naturalWidth,
      })))) {
        assert.ok(state.src.startsWith('/hrm/prototype-icons/'), state.src)
        assert.equal(state.src.includes('/hrm/hrm/'), false, state.src)
        assert.ok(state.naturalWidth > 0, path + ': ' + state.src)
      }
    }
  } finally {
    await context.close()
  }
})

import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:4189'
const tenant = '11111111-1111-4111-8111-111111111111'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

async function signIn(page, email, password) {
  await page.goto('/hrm/login', { waitUntil: 'domcontentloaded' })
  const title = page.getByRole('heading', { name: 'Вход в систему' })
  await title.waitFor()
  const emailInput = page.getByLabel('Электронная почта')
  await emailInput.waitFor({ state: 'visible' })
  await page.waitForFunction(() => !document.querySelector('#login-email')?.disabled)
  await emailInput.fill(email)
  await page.getByLabel('Пароль').fill(password)
  const [login] = await Promise.all([
    page.waitForResponse(r => new URL(r.url()).pathname === '/hrm-api/auth/login' && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Войти' }).click(),
  ])
  assert.equal(login.status(), 200, 'Actual Laravel login must succeed via the /hrm-api gateway')
  await page.waitForURL(url => url.pathname !== '/hrm/login', { timeout: 20_000 })
}

test('actual Laravel health, protected SPA subpath and isolated cookies', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1180, height: 900 } })
  const page = await context.newPage()
  const requests = []
  page.on('request', req => requests.push(new URL(req.url()).pathname))
  try {
    const health = await context.request.get('/hrm-api/api/v1/health')
    assert.equal(health.status(), 200)
    const body = await health.json()
    assert.equal(body.service, 'itp-hrm-api')
    assert.equal(body.capabilities.browser_login, true, 'This is an opt-in ephemeral test backend')
    assert.equal((await context.request.get('/hrm/fonts.css')).status(), 200)
    assert.equal((await context.request.get('/hrm/fonts/GolosText.ttf')).status(), 200)

    await page.goto('/hrm/employees')
    await page.waitForURL(url => url.pathname === '/hrm/login')
    assert.equal(new URL(page.url()).searchParams.get('redirect'), '/employees')
    await signIn(page, 'connected-admin@example.test', 'Connected-PG-CI-Only!2026')
    const cookies = await context.cookies()
    assert.ok(cookies.some(c => c.name === 'hrm_connected_e2e_session'))
    assert.ok(cookies.some(c => c.name === 'HRM-XSRF-TOKEN'))
    assert.equal(cookies.some(c => c.name === 'XSRF-TOKEN'), false)
    assert.equal(requests.some(p => /^\/(?:api|auth|sanctum)\//.test(p)), false,
      'The shared platform API/auth must never be contacted by HRM')
    assert.ok(requests.includes('/hrm-api/auth/login'))

    const access = await page.evaluate(async () => {
      const res = await fetch('/hrm-api/api/v1/me/access', { headers: { Accept: 'application/json' } })
      return { status: res.status, body: await res.json() }
    })
    assert.equal(access.status, 200)
    assert.equal(access.body.data.companies[0].company_id, tenant)
    assert.equal(access.body.data.companies[0].role_code, 'company_admin')
    assert.equal(access.body.meta.source, 'server')

    const employees = await page.evaluate(async company => {
      const res = await fetch('/hrm-api/api/v1/companies/' + company + '/employees?per_page=10', { headers: { Accept: 'application/json' } })
      return { status: res.status, body: await res.json() }
    }, tenant)
    assert.equal(employees.status, 200)
    assert.equal(employees.body.data[0].personnel_number, 'PG-E2E-001',
      'Employee data must be read from PostgreSQL Laravel API, never mockApi')

    await page.goto('/hrm/roles')
    await page.getByRole('heading', { name: 'Назначение ролей', exact: true }).waitFor()
    await page.getByText('Synthetic Connected HR Admin', { exact: true }).waitFor()
    await page.getByText('Synthetic Connected Employee', { exact: true }).waitFor()
    assert.equal(await page.getByText('Demo API route not implemented').count(), 0)
    assert.equal(await page.getByText('Демонстрационные учётные записи и роли.').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally { await context.close() }
})

test('connected employee is restricted to own workspace, not administrator pages', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 812 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  try {
    await signIn(page, 'connected-employee@example.test', 'Connected-Staff-CI-Only!2026')
    await page.goto('/hrm/roles')
    await page.getByRole('heading', { name: 'Доступ ограничен' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/hrm/access-denied')
    await page.goto('/hrm/my')
    await page.waitForURL(url => url.pathname === '/hrm/my')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    assert.deepEqual(errors, [], 'Connected employee workspace must have no runtime errors')
  } finally { await context.close() }
})

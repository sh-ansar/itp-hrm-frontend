import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// This entire scenario runs in an ephemeral PostgreSQL 16 CI service.
// It exercises the real Laravel PHP runtime, a same-origin /hrm-api
// gateway, browser cookies, CSRF, company isolation, and Vue auth guards.
const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const prefix = '/hrm-api'
const company = '11111111-1111-4111-8111-111111111111'
const foreignCompany = '22222222-2222-4222-8222-222222222222'

test('connected Vue /hrm-api → Laravel → PostgreSQL with independent browser session and tenant denial', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 880 } })
  try {
    const page = await context.newPage()
    const runtimeErrors = []
    page.on('pageerror', e => runtimeErrors.push(e.message))
    await page.goto('/login')
    await page.getByRole('heading', { name: 'Вход в систему' }).waitFor()

    const health = await page.request.get(prefix + '/api/v1/health', { headers: { Accept: 'application/json' } })
    assert.equal(health.status(), 200)
    assert.equal((await health.json()).service, 'itp-hrm-api')

    // With gateway mode on, unrelated platform APIs must not be proxied.
    const unprefixed = await page.request.get('/api/v1/health')
    const otherContentType = unprefixed.headers()['content-type'] ?? ''
    assert.equal(otherContentType.includes('application/json'), false,
      'Bare platform /api must never be mapped to HRM in gateway mode')

    const forbidden = await page.request.get(prefix + '/api/v1/companies', {
      headers: { Accept: 'application/json' },
    })
    assert.equal(forbidden.status(), 401, 'Guest must not enumerate company data')

    // First-party, cookie-backed login: no demo state, no credentials in storage.
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    const [login] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith(prefix + '/auth/login') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Войти', exact: true }).click(),
    ])
    assert.equal(login.status(), 200)
    await page.getByRole('heading', { name: 'Главная' }).waitFor()
    const cookies = await context.cookies()
    assert.ok(cookies.some(c => c.name === 'hrm_ci_browser_session'), 'Dedicated HRM session cookie')
    assert.ok(cookies.some(c => c.name === 'HRM-XSRF-TOKEN'), 'Dedicated HRM CSRF cookie')
    assert.equal(cookies.some(c => c.name === 'XSRF-TOKEN'), false, 'No shared platform XSRF cookie')

    const me = await page.request.get(prefix + '/api/v1/me', { headers: { Accept: 'application/json' } })
    assert.equal(me.status(), 200)
    assert.equal((await me.json()).data.name, 'Synthetic HR E2E')

    const companies = await page.request.get(prefix + '/api/v1/companies', {
      headers: { Accept: 'application/json' },
    })
    assert.equal(companies.status(), 200)
    assert.ok((await companies.json()).data.some(item => item.id === company))

    const people = await page.request.get(prefix + '/api/v1/companies/' + company + '/employees', {
      headers: { Accept: 'application/json' },
    })
    assert.equal(people.status(), 200)
    assert.ok((await people.json()).data.some(item => item.personnel_number === 'E2E-001'))

    const other = await page.request.get(prefix + '/api/v1/companies/' + foreignCompany + '/employees', {
      headers: { Accept: 'application/json' },
    })
    assert.ok([403, 404].includes(other.status()), 'Foreign-tenant data must be denied')

    const noCsrf = await page.request.post(prefix + '/auth/logout', {
      headers: { Accept: 'application/json' },
    })
    assert.equal(noCsrf.status(), 419, 'A mutation without XSRF header must fail')
    assert.equal((await page.request.get(prefix + '/api/v1/me', { headers: { Accept: 'application/json' } })).status(),
      200, 'CSRF failure cannot revoke an otherwise valid session')

    const local = await page.evaluate(() => Object.entries(localStorage))
    assert.ok(local.every(([key, value]) => !/password|token|session|auth/i.test(key)
      && !/SyntheticE2E-Only|synthetic-e2e@example.test/.test(value)),
    'Browser storage must contain no credentials, secrets, or identity')
    await page.getByRole('button', { name: 'Выйти' }).click()
    await page.getByRole('heading', { name: 'Вход в систему' }).waitFor()
    assert.equal((await page.request.get(prefix + '/api/v1/me', {
      headers: { Accept: 'application/json' },
    })).status(), 401)
    assert.deepEqual(runtimeErrors, [])
  } finally {
    await context.close()
    await browser.close()
  }
})

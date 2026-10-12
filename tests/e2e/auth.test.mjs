import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const appUrl = 'http://127.0.0.1:5173'
const userEmail = 'synthetic-e2e@example.test'
const userPassword = 'SyntheticE2E-Only!2026'

let browser

before(async () => {
  browser = await chromium.launch({ headless: true })
})

after(async () => {
  await browser?.close()
})

async function createPage(t) {
  const context = await browser.newContext({ baseURL: appUrl })
  t.after(async () => context.close())
  const page = await context.newPage()
  return { context, page }
}

async function signIn(page, email = userEmail, password = userPassword) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(password)
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Войти' }).click(),
  ])
  return response
}

test('guests cannot silently enter HR route and see an accessible login view', async (t) => {
  const { page } = await createPage(t)
  await page.goto('/employees')
  await page.getByRole('heading', { name: 'Вход в систему' }).waitFor()
  assert.match(page.url(), /\/login\?redirect=/)
  assert.equal(new URL(page.url()).searchParams.get('redirect'), '/employees')
  assert.equal(await page.getByLabel('Пароль').getAttribute('type'), 'password')
})

test('valid session rotates session cookie, survives refresh and accesses Sanctum API', async (t) => {
  const { page, context } = await createPage(t)
  await page.goto('/login')
  await page.evaluate(() => fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' }))
  const oldCookie = (await context.cookies()).find((c) => c.name === 'itp_hrm_e2e_session')
  assert.ok(oldCookie?.value, 'CSRF initialization must establish session cookie')

  const result = await signIn(page)
  assert.equal(result.status(), 200)
  await page.getByRole('heading', { name: 'Обзор системы' }).waitFor()

  const newCookie = (await context.cookies()).find((c) => c.name === 'itp_hrm_e2e_session')
  assert.ok(newCookie?.value)
  assert.notEqual(oldCookie.value, newCookie.value, 'login must rotate session ID')
  assert.equal(await page.getByText('Synthetic HR E2E').count(), 1)

  let me = await page.evaluate(async () => {
    const response = await fetch('/api/v1/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    return { status: response.status, body: await response.json() }
  })
  assert.equal(me.status, 200)
  assert.equal(me.body.data.name, 'Synthetic HR E2E')
  assert.equal(Object.hasOwn(me.body.data, 'email'), false, 'minimal identity projection')

  await page.reload()
  await page.getByRole('heading', { name: 'Обзор системы' }).waitFor()
  assert.equal(await page.getByText('Synthetic HR E2E').count(), 1)
  assert.equal(await page.evaluate(() => localStorage.length), 0, 'credentials and HR data stay out of localStorage')

  const csrfDenied = await page.evaluate(async () => {
    const response = await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    return response.status
  })
  assert.equal(csrfDenied, 419, 'browser logout without CSRF must fail')
  me = await page.evaluate(async () => {
    const response = await fetch('/api/v1/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    return { status: response.status, body: await response.json() }
  })
  assert.equal(me.status, 200, 'CSRF rejection must not log out the user')

  await page.getByRole('button', { name: 'Выйти' }).click()
  await page.getByRole('heading', { name: 'Вход в систему' }).waitFor()
  const guestStatus = await page.evaluate(async () => {
    const response = await fetch('/api/v1/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    return response.status
  })
  assert.equal(guestStatus, 401, 'logout invalidates session API access')
})

test('wrong credentials show a controlled error with no account enumeration', async (t) => {
  const { page } = await createPage(t)
  const response = await signIn(page, userEmail, 'wrong password')
  assert.equal(response.status(), 422)
  await page.getByRole('alert').waitFor()
  assert.match(await page.getByRole('alert').innerText(), /Проверьте данные/)
  assert.equal(await page.getByLabel('Пароль').inputValue(), '', 'clear password after failure')
})

test('repeated credential failures produce an observable HTTP 429 lockout', async (t) => {
  const { page } = await createPage(t)
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('lockout-e2e@example.test')

  for (let i = 0; i < 6; i++) {
    await page.getByLabel('Пароль').fill('invalid')
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Войти' }).click(),
    ])
    assert.equal(response.status(), i === 5 ? 429 : 422)
  }

  await page.getByRole('alert').waitFor()
  assert.match(await page.getByRole('alert').innerText(), /Слишком много попыток/)
})

test('other browser origins cannot obtain authenticated cross-origin JSON', async (t) => {
  const { page } = await createPage(t)
  await page.goto('/login')
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('http://127.0.0.1:8000/auth/me', { credentials: 'include' })
      return false
    } catch {
      return true
    }
  })
  assert.equal(blocked, true, 'no cross-origin CORS authorization')
})

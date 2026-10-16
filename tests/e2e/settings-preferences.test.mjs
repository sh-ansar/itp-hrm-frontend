import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
const email = 'synthetic-e2e@example.test'
const password = 'SyntheticE2E-Only!2026'

let browser

before(async () => {
  browser = await chromium.launch({ headless: true })
})

after(async () => {
  await browser?.close()
})

async function signIn(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(password)
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Войти' }).click(),
  ])
  assert.equal(response.status(), 200)
}

test('notification preferences persist on the server and password rule is 8+ digit + symbol', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  try {
    await signIn(page)
    await page.goto('/settings')
    await page.waitForURL(/\/settings$/)

    await page.getByRole('button', { name: 'Уведомления', exact: true }).click()

    const emailToggle = page.locator('label.toggle-setting').filter({ hasText: 'Email' }).locator('input[type="checkbox"]')
    const learningToggle = page.locator('label.toggle-setting').filter({ hasText: /Обучение|резерв/i }).locator('input[type="checkbox"]')
    await emailToggle.waitFor()
    await learningToggle.waitFor()

    if (await emailToggle.isChecked()) await emailToggle.uncheck()
    if (!(await learningToggle.isChecked())) await learningToggle.check()

    const saveButton = page.getByRole('button', { name: 'Сохранить', exact: true })
    assert.equal(await saveButton.isEnabled(), true)
    await saveButton.click()

    await page.waitForFunction(async () => {
      const response = await fetch('/api/v1/me/preferences', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) return false
      const body = await response.json()
      return body.data?.notification_channels?.email === false
        && body.data?.notification_rules?.learning_reserve === true
        && Number(body.data?.revision || 0) >= 1
    })

    const saved = await page.evaluate(async () => {
      const response = await fetch('/api/v1/me/preferences', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.json() }
    })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.data.notification_channels.email, false)
    assert.equal(saved.body.data.notification_rules.learning_reserve, true)
    assert.ok(saved.body.data.revision >= 1)

    await page.reload()
    await page.getByRole('button', { name: 'Уведомления', exact: true }).click()
    const emailReloaded = page.locator('label.toggle-setting').filter({ hasText: 'Email' }).locator('input[type="checkbox"]')
    const learningReloaded = page.locator('label.toggle-setting').filter({ hasText: /Обучение|резерв/i }).locator('input[type="checkbox"]')
    await emailReloaded.waitFor()
    assert.equal(await emailReloaded.isChecked(), false)
    assert.equal(await learningReloaded.isChecked(), true)

    await page.getByRole('button', { name: 'Безопасность', exact: true }).click()
    await page.getByText(/Декоративные переключатели безопасности в браузере больше не сохраняются/).waitFor()
    assert.equal(await page.getByLabel(/MFA/i).count(), 0)
    assert.equal(await page.getByLabel(/Ограничение IP|IP restriction/i).count(), 0)

    const submit = page.getByRole('button', { name: 'Сменить пароль', exact: true })
    await page.getByLabel('Текущий пароль', { exact: true }).fill(password)
    await page.getByLabel('Новый пароль', { exact: true }).fill('Abcdef1!')
    await page.getByLabel('Повторите новый пароль', { exact: true }).fill('Abcdef1!')
    assert.equal(await submit.isDisabled(), false)

    await page.getByLabel('Новый пароль', { exact: true }).fill('Abcdefg!')
    await page.getByLabel('Повторите новый пароль', { exact: true }).fill('Abcdefg!')
    assert.equal(await submit.isDisabled(), true)
  } finally {
    await context.close()
  }
})

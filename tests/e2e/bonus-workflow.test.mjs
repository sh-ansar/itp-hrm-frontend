import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const user = 'synthetic-e2e@example.test'
const password = 'SyntheticE2E-Only!2026'
const approver = 'synthetic-bonus-approver@example.test'
const approverPassword = 'SyntheticBonusApproval-Only!2026'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

async function login(page, email, secret) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(secret)
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('heading', { name: 'Главная' }).waitFor()
}
async function openBonuses(page) {
  await page.goto('/personnel-actions')
  await page.locator('.view-tabs').getByRole('button', { name: 'Премии и поощрения' }).click()
  await page.getByRole('heading', { name: 'Премии и поощрения' }).waitFor()
}

test('HR proposes bonus, admin approves it and monetary record survives reload without payroll posting', async () => {
  const hrContext = await browser.newContext({ baseURL, viewport: { width: 375, height: 850 } })
  const adminContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } })
  const hr = await hrContext.newPage()
  const admin = await adminContext.newPage()
  const errors = []
  hr.on('pageerror', error => errors.push('HR: '+error.message))
  admin.on('pageerror', error => errors.push('Admin: '+error.message))
  hr.on('dialog', dialog => dialog.accept())
  admin.on('dialog', dialog => dialog.accept())
  try {
    await login(hr, user, password)
    await openBonuses(hr)
    await hr.getByRole('button', { name: 'Оформить премию' }).click()
    const drawer = hr.getByRole('dialog', { name: 'Оформить премию' })
    await drawer.waitFor()
    await drawer.locator('.lookup select').selectOption('77777777-7777-4777-8777-777777777777')
    await drawer.getByLabel('Дата премирования').fill('2026-10-15')
    await drawer.getByLabel('Сумма').fill('15000.50')
    await drawer.getByLabel('Валюта').selectOption('KZT')
    await drawer.getByLabel('Документ-основание').fill('E2E-BONUS-2026')
    await drawer.getByRole('button', { name: 'Сохранить черновик' }).click()
    await drawer.waitFor({ state: 'hidden', timeout: 10_000 })
    const bonus = hr.locator('.bonus-row').filter({ hasText: 'E2E-BONUS-2026' })
    await bonus.waitFor()
    assert.match(await bonus.innerText(), /15000.50 KZT/)
    await bonus.getByRole('button', { name: 'Отправить' }).click()
    await hr.locator('.bonus-row').filter({ hasText: 'E2E-BONUS-2026' })
      .getByText('На согласовании').waitFor()
    assert.equal(await bonus.getByRole('button', { name: 'Утвердить' }).count(), 0)

    // An HR account must never be able to decide this monetary record via a raw API call.
    const denial = await hr.evaluate(async cid => {
      const response = await fetch('/api/v1/companies/'+cid+'/bonuses', { headers: { Accept: 'application/json' } })
      const record = (await response.json()).data.find(row => row.basis_reference === 'E2E-BONUS-2026')
      const decision = await fetch('/api/v1/companies/'+cid+'/bonuses/'+record.id+'/decision', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
        },
        body: JSON.stringify({ revision: record.revision, decision: 'approved' }),
      })
      return { status: decision.status, revision: record.revision }
    }, company)
    assert.equal(denial.status, 403)

    await login(admin, approver, approverPassword)
    await openBonuses(admin)
    const awaiting = admin.locator('.bonus-row').filter({ hasText: 'E2E-BONUS-2026' })
    await awaiting.waitFor()
    await awaiting.getByRole('button', { name: 'Утвердить' }).click()
    await awaiting.getByText('Утверждено').waitFor()
    await admin.reload()
    await openBonuses(admin)
    await admin.locator('.bonus-row').filter({ hasText: 'E2E-BONUS-2026' })
      .getByText('Утверждено').waitFor()

    const approved = await admin.evaluate(async cid => {
      const response = await fetch('/api/v1/companies/'+cid+'/bonuses', { headers: { Accept:'application/json' } })
      const data = await response.json()
      const bonus = data.data.find(row => row.basis_reference === 'E2E-BONUS-2026')
      return {
        status: response.status, total: data.meta.total,
        bonusStatus: bonus?.status, amount: bonus?.amount,
        payroll: data.meta.payroll_posting_enabled,
      }
    }, company)
    assert.deepEqual(approved, {
      status: 200, total: 1, bonusStatus: 'approved', amount: '15000.50', payroll: false,
    })
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    assert.deepEqual(errors, [])
  } finally {
    await hrContext.close()
    await adminContext.close()
  }
})

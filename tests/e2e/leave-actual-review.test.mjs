import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const origin = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const base = '/api/v1/companies/' + company

async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const xsrf = document.cookie.split('; ').find(v => v.startsWith('XSRF-TOKEN='))?.slice(11)
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: {
        Accept: 'application/json', 'Content-Type': 'application/json',
        ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }, { path, method, body })
}

test('schedule separates approved plan and actual; HR confirms unused vacation and keeps audited carry eligibility', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    baseURL: origin, viewport: { width: 1440, height: 940 }, acceptDownloads: true,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', err => errors.push(err.message))
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-bonus-approver@example.test')
    await page.getByLabel('Пароль').fill('SyntheticBonusApproval-Only!2026')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(url => !url.pathname.endsWith('/login'))
    const kind = await api(page, base + '/leave-types', 'POST', {
      code: 'actual_reconciliation_e2e', name: 'Annual Actual Review E2E',
      annual_days: 24, balance_method: 'calendar_days', category: 'ordinary',
    })
    assert.equal(kind.status, 201, JSON.stringify(kind.data))
    const type = kind.data.data.id
    const grant = await api(page, base + '/leave-balances/periods', 'POST', {
      employee_id: employee, leave_type_id: type, year: 2025,
      granted_days: 24, reason: 'Reviewed synthetic annual entitlement 2025',
    })
    assert.equal(grant.status, 201, JSON.stringify(grant.data))
    // Self-approval is forbidden: HR creates/submits, another admin approves.
    const hrContext = await browser.newContext({ baseURL: origin, viewport: { width: 1280, height: 800 } })
    const hrPage = await hrContext.newPage()
    await hrPage.goto('/login')
    await hrPage.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await hrPage.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await hrPage.getByRole('button', { name: 'Войти', exact: true }).click()
    await hrPage.waitForURL(url => !url.pathname.endsWith('/login'))
    const created = await api(hrPage, base + '/leave-requests', 'POST', {
      employee_id: employee, leave_type_id: type,
      planned_started_on: '2025-08-01', planned_ended_on: '2025-08-14', note: null,
    })
    assert.equal(created.status, 201, JSON.stringify(created.data))
    const requestId = created.data.data.id
    const submitted = await api(hrPage, base + '/leave-requests/' + requestId + '/submit', 'POST', { revision: 1 })
    assert.equal(submitted.status, 200, JSON.stringify(submitted.data))
    await hrContext.close()
    const decision = await api(page, base + '/leave-requests/' + requestId + '/decision', 'POST', {
      revision: 2, decision: 'approved', comment: 'Approved synthetic planned vacation',
    })
    assert.equal(decision.status, 200, JSON.stringify(decision.data))
    await page.goto('/leaves')
    const tabs = page.getByRole('navigation', { name: 'Разделы отпусков' })
    await tabs.getByRole('button', { name: 'Категории отпусков' }).waitFor()
    assert.deepEqual(await tabs.getByRole('button').allTextContents(), [
      'График отпусков', 'Остатки отпусков', 'Управление отпусками', 'Больничные', 'Категории отпусков',
    ])
    await page.getByRole('combobox', { name: 'Год', exact: true }).selectOption('2025')
    const schedule = page.getByRole('table', { name: 'График отпусков по образцу Мин и Сол' })
    const record = schedule.getByRole('row').filter({ hasText: 'E2E-001' })
    await record.getByText('Факт не подтверждён', { exact: true }).first().waitFor()
    await record.getByRole('button', { name: /Подтвердить факт отпуска:/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Подтверждение факта отпуска' })
    await dialog.getByRole('combobox', { name: 'Результат проверки' }).selectOption('not_taken')
    await dialog.getByText(/фактический расход 0 дней/).waitFor()
    await dialog.getByRole('textbox', { name: 'Основание кадрового решения' })
      .fill('Synthetic HR verified employee did not take planned 2025 leave')
    await dialog.getByRole('button', { name: 'Подтвердить факт', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    const approved = await api(page, base + '/leaves?year=2025&per_page=100')
    assert.equal(approved.status, 200)
    const leave = approved.data.data.find(row => row.leave_type_id === type)
    assert.equal(leave?.actual_review_state, 'not_taken')
    assert.equal(leave?.actual_days, 0)
    assert.equal(leave?.planned_days, 14)
    const balances = await api(page, base + '/leave-balances/registry?year=2025&q=E2E-001')
    assert.equal(balances.status, 200)
    const balance = balances.data.data[0].balances.find(row => row.leave_type_id === type)
    assert.equal(balance.granted_days, 24)
    assert.equal(balance.booked_days, 14)
    assert.equal(balance.actual_verified_days, 0)
    assert.equal(balance.unspent_entitlement_days, 24)
    await record.getByText('Не использован', { exact: true }).first().waitFor()

    const downloadStart = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Экспорт CSV' }).click()
    const download = await downloadStart
    assert.equal(download.suggestedFilename(), 'График_отпусков_2025.csv')
    await page.setViewportSize({ width: 375, height: 850 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
    await browser.close()
  }
})

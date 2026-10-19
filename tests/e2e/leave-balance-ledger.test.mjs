import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const base = `/api/v1/companies/${company}`

async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice(11)
    const response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() }
  }, { path, method, body })
}

async function enterNumberAndConfirm(page, title, days, reason, label = 'Количество дней') {
  const dialog = page.getByRole('dialog', { name: title, exact: true })
  await dialog.getByLabel(label, { exact: true }).fill(String(days))
  await dialog.getByLabel('Основание решения').fill(reason)
  await dialog.getByRole('button', { name: 'Подтвердить', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
}

test('admin UI grants, corrects, carries year; employee-scoped API cannot be forged', async () => {
  const browser = await chromium.launch({
    headless: true, ...(process.env.HRM_CHROME_PATH ? { executablePath: process.env.HRM_CHROME_PATH } : {}),
  })
  try {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 950 } })
    const page = await context.newPage()
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-bonus-approver@example.test')
    await page.getByLabel('Пароль').fill('SyntheticBonusApproval-Only!2026')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.waitForURL(url => !url.pathname.endsWith('/login'))

    const leaveType = await api(page, base + '/leave-types', 'POST', {
      code: 'ui_balance_annual', name: 'E2E annual allowance',
      annual_days: 24, balance_method: 'calendar_days', category: 'ordinary',
    })
    assert.equal(leaveType.status, 201)
    const typeId = leaveType.body.data.id

    await page.goto('/leaves')
    await page.getByRole('button', { name: 'Остатки отпусков', exact: true }).click()
    const panel = page.locator('.leave-balances')
    await panel.getByLabel('Поиск сотрудника').fill('E2E-001')
    await panel.getByRole('button', { name: 'Найти', exact: true }).click()
    await panel.getByRole('combobox', { name: 'Сотрудник', exact: true }).selectOption(employee)
    const annualCard = panel.locator('.leave-balances__item').filter({ hasText: 'E2E annual allowance' })
    await annualCard.getByText('Не настроен', { exact: true }).waitFor()
    assert.equal((await api(page, base + `/leave-balances?year=2026&employee_id=${employee}`)).body.data
      .find(row => row.leave_type_id === typeId).available_days, null)

    // The 24-day guideline is NOT a grant; the administrator enters 10 explicitly.
    await annualCard.getByRole('button', { name: 'Назначить фонд', exact: true }).click()
    await enterNumberAndConfirm(page, 'Назначить фонд отпуска', 10, 'Reviewed synthetic entitlement 2026')
    await annualCard.getByText('10 дн.', { exact: true }).first().waitFor()
    let balance = (await api(page, base + `/leave-balances?year=2026&employee_id=${employee}`))
      .body.data.find(row => row.leave_type_id === typeId)
    assert.equal(balance.granted_days, 10)
    assert.equal(balance.available_days, 10)

    await annualCard.getByRole('button', { name: 'Корректировать', exact: true }).click()
    await enterNumberAndConfirm(page, 'Корректировка фонда', 4,
      'Reviewed synthetic adjustment', 'Изменение, + или −')
    balance = (await api(page, base + `/leave-balances?year=2026&employee_id=${employee}`))
      .body.data.find(row => row.leave_type_id === typeId)
    assert.equal(balance.available_days, 14)
    assert.equal(balance.revision, 2)

    await panel.getByRole('combobox', { name: 'Год', exact: true }).selectOption('2027')
    const nextYearCard = panel.locator('.leave-balances__item').filter({ hasText: 'E2E annual allowance' })
    await nextYearCard.getByText('Не настроен', { exact: true }).waitFor()
    await nextYearCard.getByRole('button', { name: 'Назначить фонд', exact: true }).click()
    await enterNumberAndConfirm(page, 'Назначить фонд отпуска', 7, 'Reviewed synthetic entitlement 2027')
    await nextYearCard.getByRole('button', { name: 'Перенести дни', exact: true }).click()
    await enterNumberAndConfirm(page, 'Перенос неиспользованных дней', 3,
      'Approved carry from previous year')
    const next = (await api(page, base + `/leave-balances?year=2027&employee_id=${employee}`))
      .body.data.find(row => row.leave_type_id === typeId)
    assert.equal(next.carried_days, 3)
    assert.equal(next.available_days, 10)
    assert.equal((await api(page, base + `/leave-balances?year=2026&employee_id=${employee}`))
      .body.data.find(row => row.leave_type_id === typeId).state, 'closed')
    assert.equal((await api(page, base + `/leave-balances?year=2026&employee_id=00000000-0000-4000-8000-000000000000`)).status, 404)

    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 950 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    }
    await context.close()
  } finally {
    await browser.close()
  }
})

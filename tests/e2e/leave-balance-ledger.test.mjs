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
  // Capture the actual mounted drawer state so failed UI transitions are diagnosable.
  try {
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
  } catch (error) {
    const state = await page.evaluate(() => ({
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map(node => ({
        title: node.getAttribute('aria-label'),
        text: (node.textContent || '').slice(0,420),
        fields: [...node.querySelectorAll('input')].map(input => input.getAttribute('type')),
      })),
      buttons: [...document.querySelectorAll('button')].filter(node =>
        node.textContent?.includes('Назначить фонд')).map(node => node.textContent?.trim()),
    }))
    throw new Error(`Expected ${title}, mounted UI: ${JSON.stringify(state)}; ${error.message}`)
  }
  const number = dialog.locator('input[type="number"]')
  await number.fill(String(days))
  await dialog.getByRole('textbox', { name: 'Основание решения' }).fill(reason)
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
    await page.getByLabel('Поиск сотрудника').fill('E2E-001')
    const registry = page.locator('.leave-balance-register')
    const registerRow = registry.getByRole('row').filter({ hasText: 'E2E-001' })
      .filter({ hasText: 'E2E annual allowance' })
    await registerRow.getByRole('button', { name: 'Детали' }).click()
    const panel = registry.locator('.leave-balances')
    await panel.waitFor()
    await panel.getByRole('combobox', { name: 'Сотрудник', exact: true })
      .selectOption(employee)
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
    const closed = (await api(page, base + `/leave-balances?year=2026&employee_id=${employee}`))
      .body.data.find(row => row.leave_type_id === typeId)
    assert.equal(closed.state, 'closed')
    assert.equal(closed.available_days, 0)
    assert.equal(closed.closing_available_days, 14)
    assert.equal(closed.carried_out_days, 3)
    await panel.getByRole('combobox', { name: 'Год', exact: true }).selectOption('2026')
    const closedCard = panel.locator('.leave-balances__item').filter({ hasText: 'E2E annual allowance' })
    await closedCard.getByText('Год закрыт', { exact: true }).waitFor()
    await closedCard.locator('.leave-balances__figures div').filter({ hasText: 'Остаток при закрытии' })
      .getByText('14 дн.', { exact: true }).waitFor()
    await closedCard.locator('.leave-balances__figures div').filter({ hasText: 'Доступно' })
      .getByText('0 дн.', { exact: true }).waitFor()
    assert.equal(await closedCard.getByRole('button', { name: 'Корректировать' }).count(), 0)
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

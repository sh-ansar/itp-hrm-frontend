import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const baseURL = 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const restricted = '99999999-9999-4999-8999-999999999999'
const actors = {
  admin: ['synthetic-bonus-approver@example.test', 'SyntheticBonusApproval-Only!2026'],
  hr: ['synthetic-e2e@example.test', 'SyntheticE2E-Only!2026'],
  manager: ['synthetic-manager@example.test', 'SyntheticRole-Only!2026'],
  employee: ['synthetic-employee@example.test', 'SyntheticRole-Only!2026'],
}
async function login(browser, actor, width = 1440) {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 1000 } })
  if (actor === 'employee') await context.addInitScript(() => localStorage.setItem('hrm-start-screen', '/employees'))
  if (actor === 'hr' || actor === 'manager') await context.addInitScript(() => localStorage.setItem('hrm-theme', 'dark'))
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(actors[actor][0])
  await page.getByLabel('Пароль').fill(actors[actor][1])
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Войти', exact: true }).click(),
  ])
  assert.equal(response.status(), 200)
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  return { context, page }
}
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.split('=').slice(1).join('=')
    const response = await fetch(path, { method, credentials: 'same-origin', headers: {
      Accept: 'application/json', 'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, body: response.status === 204 ? null : await response.json() }
  }, { path, method, body })
}

test('four real user roles have distinct navigation, inputs, outputs and server authorization', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const [actor, width] of [['admin', 1440], ['hr', 768], ['manager', 1440], ['employee', 375]]) {
      const { context, page } = await login(browser, actor, width)
      try {
        if (actor === 'employee') {
          await page.waitForURL('**/settings')
          const start = page.getByRole('combobox', { name: 'Стартовый экран', exact: true })
          assert.deepEqual(await start.locator('option').evaluateAll(options => options.map(option => option.value)), ['/'])
          assert.equal(await start.inputValue(), '/')
          await page.getByRole('button', { name: 'Безопасность', exact: true }).click()
          await page.getByText('Сотрудник', { exact: true }).waitFor()
          await page.getByText('Личные настройки', { exact: true }).waitFor()
          assert.equal(await page.getByRole('combobox', { name: 'Боковое меню', exact: true }).count(), 0)
          assert.equal(await page.locator('.sidebar').count(), 0)
          assert.equal(await page.getByRole('searchbox', { name: 'Поиск сотрудника' }).count(), 0)
          assert.equal(await page.getByRole('button', { name: 'Открыть меню', exact: true }).count(), 0)
          assert.equal((await api(page, `/api/v1/companies/${company}/employees`)).status, 403)
          await page.goto('/employees')
          await page.getByRole('heading', { name: 'Доступ ограничен' }).waitFor()
          await page.goto('/')
          await page.waitForURL('**/settings')
          await page.reload()
          assert.equal(await page.locator('.sidebar').count(), 0)
        } else {
          await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
          const nav = page.locator('.sidebar-nav')
          assert.equal(await nav.getByRole('link', { name: 'Роли и права', exact: true }).count(), actor === 'admin' ? 1 : 0)
          assert.equal(await nav.getByRole('link', { name: 'Документы и приказы', exact: true }).count(), actor === 'manager' ? 0 : 1)
          if (actor !== 'admin') {
            assert.equal((await api(page, `/api/v1/companies/${company}/memberships`)).status, 403)
            const deny = await api(page, `/api/v1/companies/${company}/worktime/calendar`, 'PUT', { month: '2026-10', days: [] })
            assert.equal(deny.status, 403)
          }
          const rows = await api(page, `/api/v1/companies/${company}/employees?status=active`)
          assert.equal(rows.status, 200)
          if (actor === 'manager') {
            assert.deepEqual(rows.body.data.map(row => row.id), [employee])
            assert.equal('birth_date' in rows.body.data[0], false)
            assert.equal('contract_type' in rows.body.data[0], false)
            assert.equal((await api(page, `/api/v1/companies/${company}/employees/${restricted}`)).status, 404)
            assert.equal((await api(page, `/api/v1/companies/${company}/employees/${employee}/contracts`)).status, 403)
            assert.equal((await api(page, `/api/v1/companies/${company}/employees/${employee}`, 'PUT', { revision: 1, last_name: 'Denied' })).status, 403)
            await page.goto('/employees')
            await page.getByRole('row', { name: /E2E-001/ }).waitFor()
            assert.equal(await page.getByRole('row', { name: /RESTRICTED-002/ }).count(), 0)
            assert.equal(await page.getByRole('button', { name: 'Добавить сотрудника', exact: true }).count(), 0)
          } else {
            assert.equal(rows.body.data.length, 2)
            assert.ok('birth_date' in rows.body.data[0])
          }
          assert.equal((await api(page, '/api/v1/companies/22222222-2222-4222-8222-222222222222/employees')).status, 403)
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
        if (actor === 'employee') await context.clearCookies({ name: 'XSRF-TOKEN' })
        const [logout] = await Promise.all([
          page.waitForResponse(r => r.url().endsWith('/auth/logout') && r.request().method() === 'POST'),
          page.getByRole('button', { name: 'Выйти из системы', exact: true }).click(),
        ])
        assert.equal(logout.status(), 204, actor + ' signs out, even after CSRF-cookie expiry')
        await page.waitForURL(url => url.pathname === '/login')
        assert.equal((await api(page, '/auth/me')).status, 401)
        await page.goto('/employees')
        await page.waitForURL(url => url.pathname === '/login')
        assert.equal(await page.locator('.sidebar').count(), 0)
      } finally { await context.close() }
    }
  } finally { await browser.close() }
})

test('admin assigns manager scope through UI, reloads it and target sees only that department', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const { context, page } = await login(browser, 'admin')
    await page.goto('/roles')
    await page.getByRole('heading', { name: 'Назначение ролей' }).waitFor()
    await page.getByRole('button', { name: 'Действия: Synthetic Employee User', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Изменить роль', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Изменить роль', exact: true })
    await drawer.getByRole('combobox', { name: 'Роль', exact: true }).selectOption('department_manager')
    assert.equal(await drawer.getByRole('button', { name: 'Сохранить роль', exact: true }).isDisabled(), true)
    await drawer.getByRole('checkbox', { name: 'Visible Finance Child', exact: true }).check()
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/memberships/') && r.request().method() === 'PUT'),
      drawer.getByRole('button', { name: 'Сохранить роль', exact: true }).click(),
    ])
    assert.equal(response.status(), 200)
    assert.deepEqual((await response.json()).data.department_ids, ['55555555-5555-4555-8555-555555555555'])
    await page.reload()
    const row = page.getByRole('row').filter({ hasText: 'synthetic-employee@example.test' })
    await row.getByText('Руководитель подразделения', { exact: true }).waitFor()
    assert.equal(await row.getByText('Visible Finance Child', { exact: true }).count(), 1)
    const target = await login(browser, 'employee')
    await target.page.goto('/employees')
    await target.page.getByRole('row', { name: /RESTRICTED-002/ }).waitFor()
    assert.equal(await target.page.getByRole('row', { name: /E2E-001/ }).count(), 0)
    const result = await api(target.page, `/api/v1/companies/${company}/employees?status=active`)
    assert.equal(result.status, 200)
    assert.deepEqual(result.body.data.map(row => row.id), [restricted])
    await target.context.close()
    await context.close()
  } finally { await browser.close() }
})

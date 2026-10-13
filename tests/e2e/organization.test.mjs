import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('organization page displays authorized company and department only', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная' }).waitFor()
    await page.goto('/organization')
    await page.getByRole('heading', { name: 'Организационная структура' }).waitFor()
    await page.getByRole('navigation', { name: 'Представление организационной структуры' }).getByRole('button', { name: 'Таблица' }).click()
    const select = page.getByLabel('Компания')
    await select.waitFor()
    assert.match(await select.textContent(), /Test Company Visible/)
    assert.doesNotMatch(await select.textContent(), /Test Company Hidden/)
    assert.equal(await page.getByRole('button', { name: 'Добавить подразделение' }).count(), 0)
    const table = page.getByRole('table', { name: 'Подразделения компании' })
    try { await table.waitFor({ timeout: 8000 }) } catch {
      const diagnostics = await page.locator('body').innerText()
      const api = await page.evaluate(async () => { const r = await fetch('/api/v1/companies/11111111-1111-4111-8111-111111111111/departments', { headers: { Accept: 'application/json' } }); return { status: r.status, body: (await r.text()).slice(0,500) } })
      throw new Error('Organization table absent: ' + JSON.stringify({ diagnostics: diagnostics.slice(0,600), api }))
    }
    assert.match(await page.getByRole('table', { name: 'Подразделения компании' }).textContent(), /Visible Finance/)
    assert.equal(await page.getByText('Hidden Department').count(), 0)
    const childRow = page.getByRole('row', { name: /Visible Finance Child/ })
    await childRow.waitFor()
    assert.match(await childRow.textContent(), /Visible Finance/)
    assert.match(await childRow.locator('td').first().textContent(), /↳/)
    assert.equal(await page.getByText('Родитель вне текущего списка').count(), 0)
    const unauthorized = await page.evaluate(async () => {
      const result = await fetch('/api/v1/companies/22222222-2222-4222-8222-222222222222/departments',
        { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      return result.status
    })
    assert.equal(unauthorized, 403)
  } finally { await context.close() }
})


test('organization and employee registries remain usable at mobile tablet desktop widths', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width, height: 850 } })
    const page = await context.newPage()
    try {
      await page.goto('/login')
      await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
      await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
      await page.getByRole('button', { name: 'Войти' }).click()
      await page.getByRole('heading', { name: 'Главная' }).waitFor()
      for (const [route, heading] of [['/organization', 'Организационная структура'], ['/employees', 'Реестр сотрудников']]) {
        await page.goto(route)
        await page.getByRole('heading', { name: heading }).waitFor()
        await page.getByLabel('Компания').waitFor()
        const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
        const overflows = horizontalOverflow ? await page.evaluate(() => ({ size: [window.innerWidth, document.documentElement.scrollWidth], layout: ['.app-shell','.sidebar','.sidebar nav','.main','.topbar','.content','.organization-page'].map(sel => { const el = document.querySelector(sel); const r = el?.getBoundingClientRect(); return [sel,r?.x,r?.width,getComputedStyle(el ?? document.body).display,getComputedStyle(el ?? document.body).overflowX] }), nodes: Array.from(document.querySelectorAll('*')).filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 8).map(el => ({ tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', right: Math.round(el.getBoundingClientRect().right) })) })) : []
        assert.equal(horizontalOverflow, false, `${route} width ${width} should not overflow document; ${JSON.stringify(overflows)}`)
        const select = page.getByLabel('Компания')
        const bounds = await select.boundingBox()
        assert.ok(bounds && bounds.width > 80 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1,
          `${route} selector must fit viewport ${width}`)
      }
    } finally { await context.close() }
  }
})

test('employee register opens scoped detail and assignment history', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 850 } })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная' }).waitFor()
    await page.goto('/employees')
    assert.equal(await page.getByRole('button', { name: 'Добавить сотрудника' }).count(), 0)
    await page.locator('.employee-mobile-card').filter({ hasText: 'E2E-001' }).getByRole('link', { name: /Открыть карточку/ }).click()
    await page.locator('.employee-page-heading h1').waitFor()
    await page.getByText('Synthetic Employee').waitFor()
    assert.match(await page.locator('main').innerText(), /Synthetic Employee/)
    assert.match(await page.locator('main').innerText(), /Test Engineer/)
    assert.match(await page.locator('main').innerText(), /Visible Finance/)
    assert.equal(await page.getByRole('button', { name: 'Изменить карточку' }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Перевести' }).count(), 0)
    assert.equal(await page.getByRole('region', { name: 'Новое назначение' }).count(), 0)
    const unauthorized = await page.evaluate(async () => {
      const r = await fetch('/api/v1/companies/22222222-2222-4222-8222-222222222222/employees/77777777-7777-4777-8777-777777777777', { headers: { Accept:'application/json' } })
      return r.status
    })
    assert.equal(unauthorized, 403)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally { await context.close() }
})


test('staffing route stays company-scoped and write controls stay hidden in read-only mode', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 850 } })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная' }).waitFor()
    await page.goto('/staffing')
    await page.getByRole('heading', { name: 'Штатное расписание', exact: true }).waitFor()
    await page.getByText('Штатное расписание ещё не создано').waitFor()
    assert.equal(await page.getByRole('button', { name: /Новая версия|Создать первую версию/ }).count(), 0)
    assert.equal(await page.getByText('Test Company Hidden').count(), 0)
    const denied = await page.evaluate(async () => {
      const response = await fetch('/api/v1/companies/22222222-2222-4222-8222-222222222222/staffing-plans', { headers: { Accept: 'application/json' } })
      return response.status
    })
    assert.equal(denied, 403)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally { await context.close() }
})


test('personnel editor stays hidden while server write flag is disabled', async () => {
  const context = await browser.newContext({ baseURL:'http://127.0.0.1:5173', viewport:{ width:375,height:850 } })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name:'Войти' }).click()
    await page.getByRole('heading', { name:'Главная' }).waitFor()
    await page.goto('/employees')
    await page.locator('.employee-mobile-card').filter({ hasText: 'E2E-001' }).getByRole('link', { name: /Открыть карточку/ }).click()
    await page.locator('.employee-page-heading h1').waitFor()
    await page.getByText('Synthetic Employee').waitFor()
    assert.equal(await page.getByRole('region', { name:'Добавление кадровых сведений' }).count(), 0)
    assert.equal(await page.getByRole('button', { name:'Сохранить запись' }).count(), 0)
  } finally { await context.close() }
})


test('position directory is visible but write controls stay hidden in read-only mode', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 850 } })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная' }).waitFor()
    await page.goto('/directories')
    await page.getByRole('heading', { name: 'Справочники' }).waitFor()
    const position = page.locator('.position-card').filter({ hasText: 'Test Engineer' })
    await position.waitFor()
    assert.match(await position.innerText(), /Test Engineer/)
    assert.equal(await page.getByRole('button', { name: 'Добавить должность' }).count(), 0)
    assert.equal(await page.getByText('Test Company Hidden').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})


test('personnel action journal is readable but writes stay hidden in read-only mode', async () => {
  const context = await browser.newContext({ baseURL:'http://127.0.0.1:5173', viewport:{ width:375,height:850 } })
  const page = await context.newPage()
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name:'Войти' }).click()
    await page.getByRole('heading', { name:'Главная' }).waitFor()
    await page.goto('/personnel-actions')
    await page.getByRole('heading', { name:'Кадровые действия', exact:true }).waitFor()
    await page.getByText('Кадровых действий пока нет').waitFor()
    assert.equal(await page.getByRole('button', { name:'Новое действие' }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally { await context.close() }
})

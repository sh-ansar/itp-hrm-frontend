import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('heading', { name: 'Главная' }).waitFor()
}

test('BNT-style shell supports collapse, navigation groups and topbar employee search', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  try {
    await login(page)
    await page.getByRole('button', { name: 'Свернуть меню' }).click()
    assert.equal(await page.locator('.app-shell').evaluate(el => el.classList.contains('app-shell--collapsed')), true)
    await page.waitForFunction(() => {
      const sidebar = document.querySelector('.sidebar')
      return sidebar && sidebar.getBoundingClientRect().width <= 75
    }, { timeout: 2500 })
    const sidebar = await page.locator('.sidebar').boundingBox()
    assert.ok(sidebar && sidebar.width <= 75, 'Sidebar collapses to icon rail')
    await page.getByRole('navigation', { name: 'Главная навигация' }).getByRole('link', { name: 'Сотрудники' }).click()
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    await page.getByRole('button', { name: 'Развернуть меню' }).click()
    const primaryNavigation = page.getByRole('navigation', { name: 'Главная навигация' })
    assert.equal(await primaryNavigation.getByRole('link', { name: 'Сотрудники' }).isVisible(), true)
    assert.equal(await primaryNavigation.getByRole('link', { name: 'Оргструктура и штатка' }).isVisible(), true)

    const sidebarIcons = page.locator('.sidebar-nav .nav-svg-icon')
    const iconCount = await sidebarIcons.count()
    assert.ok(iconCount >= 8, 'Sidebar exposes navigation icons')
    for (let index = 0; index < iconCount; index++) {
      const state = await sidebarIcons.nth(index).evaluate(img => ({
        src: img.getAttribute('src') || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      }))
      assert.equal(state.src.includes('/hrm/hrm/'), false, 'Icon path is not double-prefixed')
      assert.equal(state.complete, true, 'Icon image request completed')
      assert.ok(state.naturalWidth > 0, 'Sidebar icon loaded successfully')
    }

    const search = page.getByRole('searchbox', { name: 'Поиск сотрудника' })
    await search.fill('E2E-001')
    await search.press('Enter')
    await page.waitForURL(/\/employees\?q=E2E-001/)
    await page.getByRole('row', { name: /E2E-001/ }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

test('mobile nav opens, closes on navigation and does not push document width', async () => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 } })
  const page = await context.newPage()
  try {
    await login(page)
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    await page.getByRole('navigation', { name: 'Главная навигация' })
      .getByRole('link', { name: 'Сотрудники' }).click()
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    assert.equal(await page.locator('.sidebar').evaluate(el => el.classList.contains('sidebar--open')), false)
    assert.equal(await page.getByRole('searchbox', { name: 'Поиск сотрудника' }).isVisible(), true)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

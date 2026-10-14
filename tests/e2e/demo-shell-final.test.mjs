import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

const expectedNavigation = [
  'Главная', 'Сотрудники', 'Оргструктура и штатка', 'Кадровые процессы',
  'Графики и табель', 'Отпуска', 'Документы и приказы',
  'Отчёты и аналитика', 'Справочники', 'Настройки',
]

test('the prototype shell has real navigation, aligned topbar and no overflow at all sizes', async () => {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 850 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/')
      await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
      const topbar = page.locator('.hrm-topbar')
      const sidebar = page.locator('.hrm-sidebar')
      const search = page.getByRole('searchbox', { name: 'Поиск сотрудника' })
      assert.equal(await search.isVisible(), true, 'search must be functional at '+width)
      const layout = await page.evaluate(() => {
        const head = document.querySelector('.hrm-topbar')
        const side = document.querySelector('.hrm-sidebar')
        const search = document.querySelector('.topbar-search')
        const h = head?.getBoundingClientRect()
        const s = side?.getBoundingClientRect()
        const f = search?.getBoundingClientRect()
        return {
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          topbarHeight: h?.height ?? 0,
          sidebarHeight: s?.height ?? 0,
          searchRight: f?.right ?? 0,
        }
      })
      assert.ok(layout.topbarHeight >= 60 && layout.topbarHeight <= 66)
      assert.ok(Math.abs(layout.sidebarHeight - 850) <= 1, 'sidebar must fill the available height')
      assert.ok(layout.searchRight <= width + 1, 'header search should stay within screen')
      assert.ok(layout.document <= width + 1 && layout.body <= width + 1,
        'page overflow at '+width+': '+JSON.stringify(layout))
      assert.equal(await topbar.getByRole('button', { name: 'Включить тёмную тему' }).count(), 1)
      assert.deepEqual(errors, [])

      if (width >= 1280) {
        const links = sidebar.getByRole('navigation', { name: 'Главная навигация' }).getByRole('link')
        const names = await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
        assert.deepEqual(names, expectedNavigation)
        assert.equal(await sidebar.locator('.is-active').count(), 1)
        const dark = page.getByRole('button', { name: 'Включить тёмную тему' })
        await dark.click()
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark')
        await page.reload()
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark')
        await page.getByRole('button', { name: 'Включить светлую тему' }).click()
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light')
      } else {
        await page.getByRole('button', { name: 'Открыть меню' }).click()
        assert.equal(await sidebar.evaluate(el => el.classList.contains('sidebar--open')), true)
        assert.equal(await page.evaluate(() => document.body.classList.contains('hrm-mobile-nav-open')), true)
        await page.keyboard.press('Escape')
        assert.equal(await sidebar.evaluate(el => el.classList.contains('sidebar--open')), false)
        assert.equal(await page.evaluate(() => document.body.classList.contains('hrm-mobile-nav-open')), false)
        assert.equal(await page.getByRole('button', { name: 'Открыть меню' }).evaluate(el => document.activeElement === el), true)
        await page.getByRole('button', { name: 'Открыть меню' }).click()
        await sidebar.getByRole('navigation', { name: 'Главная навигация' })
          .getByRole('link', { name: 'Сотрудники' }).click()
        await page.getByRole('heading', { name: 'Реестр сотрудников', level: 1 }).waitFor()
        assert.equal(await sidebar.evaluate(el => el.classList.contains('sidebar--open')), false)
      }
    } finally {
      await context.close()
    }
  }
})

test('desktop icon rail, nested active links, keyboard search and search clear are real controls', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 850 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/')
    await page.getByRole('button', { name: 'Свернуть меню' }).click()
    await page.waitForFunction(() => document.querySelector('.hrm-sidebar')?.getBoundingClientRect().width <= 70)
    assert.equal(await page.locator('.app-shell').evaluate(el => el.classList.contains('app-shell--collapsed')), true)
    const nav = page.getByRole('navigation', { name: 'Главная навигация' })
    await nav.getByRole('link', { name: 'Оргструктура и штатка' }).click()
    await page.getByRole('heading', { name: 'Организационная структура', level: 1 }).waitFor()
    await page.getByRole('button', { name: 'Развернуть меню' }).click()
    await page.waitForFunction(() => document.querySelector('.hrm-sidebar')?.getBoundingClientRect().width > 200)
    assert.equal(await nav.getByRole('link', { name: 'Оргструктура и штатка' }).getAttribute('aria-current'), 'page')
    await page.goto('/staffing')
    await page.getByRole('heading', { name: 'Штатное расписание', level: 1 }).waitFor()
    assert.equal(await nav.getByRole('link', { name: 'Оргструктура и штатка' }).getAttribute('aria-current'), 'page')
    await page.goto('/employees-development')
    await page.getByRole('heading', { name: 'Кадровый резерв и обучение', level: 1 }).waitFor()
    assert.equal(await nav.getByRole('link', { name: 'Сотрудники' }).getAttribute('aria-current'), 'page')

    await page.locator('main#main-content h1').first().click()
    await page.keyboard.press('/')
    const search = page.getByRole('searchbox', { name: 'Поиск сотрудника' })
    assert.equal(await search.evaluate(el => document.activeElement === el), true)
    await search.fill('EMP-0002')
    await search.press('Enter')
    await page.waitForURL(/\/employees\?q=EMP-0002/)
    const clear = page.getByRole('button', { name: 'Очистить поиск' })
    await clear.click()
    await page.waitForURL(/\/employees$/)
    assert.equal(await search.inputValue(), '')
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})

test('topbar does not invent a user or a logout action in public demo mode', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    assert.equal(await page.getByRole('button', { name: 'Выйти из системы' }).count(), 0)
    const copy = await page.locator('.profile-copy').innerText()
    assert.match(copy, /ITP HRM/)
    assert.doesNotMatch(copy, /Тамара|@tamar|Гологадзе/)
    assert.equal(await page.locator('.hrm-topbar').getByRole('button', { name: 'Включить тёмную тему' }).count(), 1)
  } finally {
    await context.close()
  }
})

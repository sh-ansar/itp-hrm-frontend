import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

async function signIn(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('heading', { name: 'Главная', exact: true, level: 1 }).waitFor()
}

test('all four organization and staffing tabs work at four viewport widths without document overflow', async () => {
  const views = [
    { label: 'Организационная структура', path: '/organization', heading: 'Организационная структура' },
    { label: 'Штатное расписание', path: '/staffing', heading: 'Штатное расписание' },
    { label: 'Вакантные позиции', path: '/staffing', query: 'vacant', heading: 'Вакантные позиции' },
    { label: 'Изменения штатного расписания', path: '/staffing', query: 'changes', heading: 'Изменения штатного расписания' },
  ]
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:5173',
      viewport: { width, height: 900 },
    })
    const page = await context.newPage()
    try {
      await signIn(page)
      await page.goto('/organization')
      const tabs = page.getByRole('navigation', { name: 'Разделы оргструктуры и штатного расписания' })
      for (const view of views) {
        const button = tabs.getByRole('button', { name: view.label, exact: true })
        await button.click()
        await page.waitForURL(url => url.pathname === view.path && (
          view.query ? url.searchParams.get('view') === view.query : true
        ))
        await page.getByRole('heading', { name: view.heading, level: 1 }).waitFor()
        assert.equal(await button.getAttribute('aria-current'), 'page', view.label)
        const sidebar = page.getByRole('navigation', { name: 'Главная навигация' })
          .getByRole('link', { name: 'Оргструктура и штатка' })
        assert.equal(await sidebar.evaluate(el => el.classList.contains('router-link-active')), true,
          'parent sidebar navigation must stay active on ' + view.label)
        const layout = await page.evaluate(() => {
          const strip = document.querySelector('.org-staffing-navigation .view-tabs')
          return {
            viewport: window.innerWidth,
            document: document.documentElement.scrollWidth,
            tabVerticalOverflow: strip ? getComputedStyle(strip).overflowY : 'not-rendered',
          }
        })
        assert.ok(layout.document <= layout.viewport + 1,
          `${view.label} at ${width}px overflows document: ${JSON.stringify(layout)}`)
        assert.equal(layout.tabVerticalOverflow, 'hidden',
          `${view.label} tab strip must not scroll vertically`)
      }
      await page.reload()
      assert.equal(await tabs.getByRole('button', {
        name: 'Изменения штатного расписания',
      }).getAttribute('aria-current'), 'page')
      await tabs.getByRole('button', { name: 'Организационная структура' }).click()
      // ZIP parity opens the table first; switch explicitly to the diagram for canvas assertions.
      await page.getByRole('navigation', { name: 'Представление организационной структуры' })
        .getByRole('button', { name: 'Схема', exact: true }).click()
      const diagram = page.getByRole('region', { name: 'Схема подразделений компании' })
      await diagram.waitFor()
      assert.ok(['hidden', 'clip'].includes(await diagram.evaluate(el => getComputedStyle(el).overflowY)),
        'organization canvas must not create a vertical scroll container')
    } finally {
      await context.close()
    }
  }
})

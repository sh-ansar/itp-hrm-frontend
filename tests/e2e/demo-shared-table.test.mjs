import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })
const baseURL = 'http://127.0.0.1:5173'

test('all desktop tables share readable reference geometry and remain horizontally scrollable', async () => {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/')
      const table = page.getByRole('table', { name: 'Реестр сотрудников на главной' })
      await table.waitFor()
      const metrics = await table.evaluate(element => {
        const root = element.closest('.table-scroll')
        const head = element.querySelector('thead th')
        const row = element.querySelector('tbody tr')
        const h = head && getComputedStyle(head)
        const r = row && getComputedStyle(row)
        return {
          headSize: h ? parseFloat(h.fontSize) : 0,
          headHeight: head?.getBoundingClientRect().height ?? 0,
          rowHeight: row?.getBoundingClientRect().height ?? 0,
          border: root ? getComputedStyle(root).borderTopWidth : '',
          overflowX: root ? getComputedStyle(root).overflowX : '',
          overflowY: root ? getComputedStyle(root).overflowY : '',
        }
      })
      assert.equal(metrics.headSize, 12)
      assert.ok(metrics.headHeight >= 43 && metrics.headHeight <= 90)
      assert.ok(metrics.rowHeight >= 48 && metrics.rowHeight <= 95)
      assert.equal(metrics.overflowX, 'auto')
      assert.equal(metrics.overflowY, 'hidden')
      assert.equal(metrics.border, '1px')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      const bg = await table.locator('thead th').first().evaluate(element => getComputedStyle(element).backgroundColor)
      assert.notEqual(bg, 'rgb(255, 255, 255)', 'dark mode header cannot be white')
      assert.deepEqual(errors, [])
    } finally { await context.close() }
  }
})

test('column filter, sort and reset operate on the actual loaded rows', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 880 } })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const table = page.getByRole('table', { name: 'Реестр сотрудников на главной' })
    await table.getByText('Садыков Арман Ерланович').waitFor()
    const sorting = table.getByRole('button', { name: 'Сортировать: Таб. №' })
    await sorting.click()
    const firstSorted = await table.getByRole('row').nth(1).innerText()
    await sorting.click()
    const lastSorted = await table.getByRole('row').nth(1).innerText()
    assert.notEqual(firstSorted, lastSorted)

    await table.getByRole('button', { name: 'Фильтр: ФИО / Отдел' }).click()
    const panel = page.getByRole('group', { name: 'Фильтр столбца: ФИО / Отдел' })
    await panel.getByRole('searchbox', { name: 'Значение фильтра: ФИО / Отдел' }).fill('Садыков')
    await panel.getByRole('button', { name: 'Применить' }).click()
    await table.getByRole('row').nth(1).getByText('Садыков Арман Ерланович').waitFor()
    assert.equal(await table.getByRole('row').count(), 2)
    await page.getByRole('button', { name: 'Сбросить фильтры' }).click()
    await table.getByText('Ибраева Алия Сериковна').waitFor()
    assert.equal(await table.getByRole('row').count(), 7)
  } finally { await context.close() }
})

test('the employee registry uses shared select-all and preserves selection on current page', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  try {
    await page.goto('/employees')
    const table = page.getByRole('table', { name: 'Реестр сотрудников выбранной компании' })
    await table.getByRole('row').nth(1).waitFor()
    const single = table.getByRole('checkbox', { name: /Выбрать сотрудника:/ }).first()
    await single.check()
    await page.getByText(/Выбрано на странице: 1 из/).waitFor()
    await table.getByRole('checkbox', { name: /Выбрать все строки на странице/ }).check()
    const selected = await table.getByRole('checkbox', { name: /Выбрать сотрудника:/ }).count()
    assert.ok(selected > 1)
    await page.getByText(new RegExp('Выбрано на странице: ' + selected + ' из')).waitFor()
    await table.getByRole('checkbox', { name: /Выбрать все строки на странице/ }).uncheck()
    await page.getByText(/Выбрано на странице: 0 из/).waitFor()
    await table.getByRole('button', { name: 'Фильтр: ФИО / Отдел' }).click()
    const panel = page.getByRole('group', { name: 'Фильтр столбца: ФИО / Отдел' })
    await panel.getByRole('searchbox').fill('Садыков')
    await panel.getByRole('button', { name: 'Применить' }).click()
    assert.equal(await table.getByRole('row').count(), 2)
    await table.getByRole('checkbox', { name: /Выбрать все строки на странице/ }).check()
    await page.getByText(/Выбрано на странице: 1 из/).waitFor()
    await page.getByRole('button', { name: 'Сбросить фильтры' }).click()
    assert.equal(await table.getByRole('row').count(), selected + 1)
  } finally { await context.close() }
})

test('documents, leave and training share the status-pill styling', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  try {
    for (const route of ['/documents', '/leaves', '/timesheets', '/employees-development']) {
      await page.goto(route)
      const badge = page.locator('.base-data-table .status-pill').first()
      // A section can legitimately be empty; its table still uses the shared component.
      await page.locator('.base-data-table').first().waitFor()
      if (await badge.count()) {
        const style = await badge.evaluate(element => ({
          borderRadius: getComputedStyle(element).borderRadius,
          fontSize: getComputedStyle(element).fontSize,
        }))
        assert.equal(style.borderRadius, '999px')
        assert.equal(style.fontSize, '11px')
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    }
  } finally { await context.close() }
})

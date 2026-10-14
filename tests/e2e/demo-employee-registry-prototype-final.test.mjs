import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })
const baseURL = 'http://127.0.0.1:5173'

test('register matches prototype structure and only shows genuine scoped KPI numbers', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/employees')
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    assert.equal(await page.locator('.registry-metrics .registry-summary-card').count(), 4)
    assert.equal(await page.getByRole('navigation', { name: 'Разделы реестра сотрудников' }).getByRole('button').count(), 3)
    const table = page.getByRole('table', { name: 'Реестр сотрудников выбранной компании' })
    await table.getByRole('row').nth(1).waitFor()
    assert.equal(await table.getByRole('columnheader', { name: 'Подразделение' }).count(), 1)
    assert.equal(await table.getByRole('columnheader', { name: 'Категория' }).count(), 1)
    assert.equal(await table.getByRole('row').count(), 11, 'Page size 10 is backed by API, not only a visual control')
    assert.equal(await page.getByRole('button', { name: 'На весь экран' }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Шаблоны' }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Экспорт' }).count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Действия', exact: true }).count(), 1)

    await page.getByRole('button', { name: 'Экспорт' }).click()
    const exportMenu = page.getByRole('menu', { name: 'Экспорт' })
    const download = page.waitForEvent('download')
    await exportMenu.getByRole('menuitem', { name: 'Выгрузить загруженную страницу CSV' }).click()
    assert.equal((await download).suggestedFilename(), 'employees-page-1.csv')

    await page.getByRole('button', { name: 'На весь экран' }).click()
    assert.equal(await page.locator('.registry-card--fullscreen').count(), 1)
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('.registry-card--fullscreen').count(), 0)

    await page.getByRole('button', { name: 'Поиск', exact: true }).click()
    const input = page.getByRole('searchbox', { name: 'Поиск в реестре' })
    assert.equal(await input.isVisible(), true)
    await input.fill('EMP-0002')
    await input.press('Enter')
    await table.getByText('EMP-0002').waitFor()
    assert.equal(await table.getByRole('row').count(), 2)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('register page size, action selection and view presets stay functional', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  const page = await context.newPage()
  try {
    await page.goto('/employees')
    const grid = page.getByRole('table', { name: 'Реестр сотрудников выбранной компании' })
    await grid.getByRole('row').nth(1).waitFor()
    const pageSize = page.getByRole('combobox', { name: 'Строк на странице' })
    assert.equal(await pageSize.inputValue(), '10')
    await pageSize.selectOption('15')
    await page.getByRole('row', { name: /EMP-0015/ }).waitFor()
    assert.equal(await pageSize.inputValue(), '15')
    assert.equal(await grid.getByRole('row').count(), 16)

    await page.getByRole('button', { name: 'Шаблоны' }).click()
    let templates = page.getByRole('dialog', { name: 'Шаблоны' })
    await templates.waitFor()
    await templates.getByRole('button', { name: 'Далее' }).click()
    await templates.getByRole('button', { name: 'Далее' }).click()
    await templates.getByPlaceholder('Введите название').fill('E2E вид 15 строк')
    await templates.getByRole('button', { name: 'Создать', exact: true }).click()
    await templates.getByRole('button', { name: 'Отмена' }).click()

    await pageSize.selectOption('10')
    assert.equal(await pageSize.inputValue(), '10')
    await page.getByRole('button', { name: 'Шаблоны' }).click()
    templates = page.getByRole('dialog', { name: 'Шаблоны' })
    await templates.waitFor()
    await templates.getByRole('button', { name: 'Применить' }).click()
    assert.equal(await pageSize.inputValue(), '15')

    const checkbox = grid.getByRole('checkbox', { name: /Выбрать сотрудника:/ }).first()
    await checkbox.check()
    const actions = page.getByRole('form', { name: 'Действия с выбранными строками' })
    await actions.waitFor()
    await page.getByRole('button', { name: 'Действия', exact: true }).click()
    const menu = page.getByRole('menu', { name: 'Действия' })
    const download = page.waitForEvent('download')
    await menu.getByRole('menuitem', { name: 'Экспортировать выбранных CSV' }).click()
    assert.equal((await download).suggestedFilename(), 'employees-selected.csv')
  } finally { await context.close() }
})

test('register stays within viewport on mobile, tablet, desktop and dark theme', async () => {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 850 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/employees')
      await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
      await page.locator('.registry-metrics .registry-summary-card').first().waitFor()
      const size = await page.evaluate(() => ({
        viewport: innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      assert.ok(size.html <= width + 1 && size.body <= width + 1, 'Overflow: '+JSON.stringify(size))
      if (width <= 700) {
        assert.equal(await page.locator('.registry-mobile-list').isVisible(), true)
        assert.equal(await page.getByRole('searchbox', { name: 'Поиск в реестре' }).isVisible(), true)
      }
      await page.evaluate(() => document.documentElement.dataset.theme = 'dark')
      assert.notEqual(await page.locator('.registry-summary-card').first()
        .evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)')
      assert.deepEqual(errors, [])
    } finally { await context.close() }
  }
})

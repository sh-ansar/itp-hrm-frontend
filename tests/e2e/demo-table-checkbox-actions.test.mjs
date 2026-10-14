import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })
const baseURL = 'http://127.0.0.1:5173'

test('shared column filter offers multiple checkbox values with count, apply and clear', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/')
    const registry = page.getByRole('table', { name: 'Реестр сотрудников на главной' })
    await registry.getByText('Садыков Арман Ерланович').waitFor()
    const total = await registry.getByRole('row').count()
    assert.ok(total >= 5)
    await registry.getByRole('button', { name: 'Фильтр: Пол' }).click()
    let panel = page.getByRole('group', { name: 'Фильтр столбца: Пол' })
    const male = panel.getByRole('checkbox', { name: 'Значение: М', exact: true })
    const female = panel.getByRole('checkbox', { name: 'Значение: Ж', exact: true })
    await male.waitFor()
    await female.waitFor()
    assert.equal(await male.isChecked(), true)
    assert.equal(await female.isChecked(), true)
    await female.uncheck()
    await panel.getByRole('button', { name: 'Применить' }).click()
    const maleCount = await registry.getByRole('row').count()
    assert.ok(maleCount > 1 && maleCount < total)
    await registry.getByRole('button', { name: 'Фильтр: Пол' }).click()
    panel = page.getByRole('group', { name: 'Фильтр столбца: Пол' })
    assert.equal(await panel.getByRole('checkbox', { name: 'Значение: М', exact: true }).isChecked(), true)
    await panel.getByRole('checkbox', { name: 'Значение: Ж', exact: true }).check()
    await panel.getByRole('button', { name: 'Применить' }).click()
    assert.equal(await registry.getByRole('row').count(), total)
    await page.getByRole('button', { name: 'Сбросить фильтры' }).click()
    assert.equal(await registry.getByRole('row').count(), total)

    await registry.getByRole('button', { name: 'Фильтр: Пол' }).click()
    panel = page.getByRole('group', { name: 'Фильтр столбца: Пол' })
    await panel.getByRole('checkbox', { name: 'Выбрать все значения: Пол' }).uncheck()
    assert.equal(await panel.getByRole('checkbox', { name: 'Значение: Ж', exact: true }).isChecked(), false)
    assert.equal(await panel.getByRole('checkbox', { name: 'Значение: М', exact: true }).isChecked(), false)
    await panel.getByRole('checkbox', { name: 'Выбрать все значения: Пол' }).check()
    assert.equal(await panel.getByRole('checkbox', { name: 'Значение: М', exact: true }).isChecked(), true)
    await panel.getByRole('button', { name: 'Очистить выбор' }).click()
    await panel.waitFor({ state: 'hidden' })
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('prototype home provides row checkboxes and real employee / vacancy bulk actions', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const employees = page.getByRole('table', { name: 'Реестр сотрудников на главной' })
    await employees.getByText('Садыков Арман Ерланович').waitFor()
    await employees.getByRole('checkbox', { name: /Выбрать сотрудника:/ }).first().check()
    let actions = page.getByRole('form', { name: 'Действия с выбранными строками' })
    await actions.waitFor()
    await actions.getByRole('combobox', { name: 'Действие с выбранными' }).selectOption('export_csv')
    const employeeDownload = page.waitForEvent('download')
    await actions.getByRole('button', { name: 'Выполнить' }).click()
    assert.equal((await employeeDownload).suggestedFilename(), 'overview-selected-employees.csv')
    await actions.getByRole('button', { name: 'Снять выделение' }).click()
    await actions.waitFor({ state: 'hidden' })
    assert.equal(await employees.getByRole('checkbox', { name: /Выбрать сотрудника:/ }).first().isChecked(), false)

    const vacancies = page.getByRole('table', { name: 'Вакантные штатные позиции на главной' })
    await vacancies.getByRole('row').nth(1).waitFor()
    await vacancies.getByRole('checkbox', { name: /Выбрать вакансию:/ }).first().check()
    actions = page.getByRole('form', { name: 'Действия с выбранными строками' })
    await actions.getByRole('combobox', { name: 'Действие с выбранными' }).selectOption('export_csv')
    const vacancyDownload = page.waitForEvent('download')
    await actions.getByRole('button', { name: 'Выполнить' }).click()
    assert.equal((await vacancyDownload).suggestedFilename(), 'overview-selected-vacancies.csv')
  } finally { await context.close() }
})

test('employee register offers one shared action picker when records are checked', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 }, acceptDownloads: true })
  const page = await context.newPage()
  try {
    await page.goto('/employees')
    const registry = page.getByRole('table', { name: 'Реестр сотрудников выбранной компании' })
    await registry.getByRole('row').nth(1).waitFor()
    await registry.getByRole('checkbox', { name: /Выбрать сотрудника:/ }).first().check()
    const actions = page.getByRole('form', { name: 'Действия с выбранными строками' })
    await actions.waitFor()
    const picker = actions.getByRole('combobox', { name: 'Действие с выбранными' })
    await picker.selectOption('export_csv')
    const download = page.waitForEvent('download')
    await actions.getByRole('button', { name: 'Выполнить' }).click()
    assert.equal((await download).suggestedFilename(), 'employees-selected.csv')
    await picker.selectOption('open_card')
    await actions.getByRole('button', { name: 'Выполнить' }).click()
    await page.waitForURL(/\/employees\/.+\/.+/)
    assert.equal(await page.getByRole('heading', { name: 'Основные личные данные' }).count() > 0, true)
  } finally { await context.close() }
})

test('checkbox filter panel and selected-actions never cause document overflow', async () => {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 850 } })
    const page = await context.newPage()
    try {
      await page.goto('/')
      const registry = page.getByRole('table', { name: 'Реестр сотрудников на главной' })
      await registry.getByRole('row').nth(1).waitFor()
      await registry.getByRole('button', { name: 'Фильтр: Статус' }).click()
      await page.getByRole('group', { name: 'Фильтр столбца: Статус' }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'filter panel width at ' + width)
      await page.getByRole('group', { name: 'Фильтр столбца: Статус' })
        .getByRole('button', { name: 'Закрыть фильтр' }).click()
      await registry.getByRole('checkbox', { name: /Выбрать сотрудника:/ }).first().check()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'actions width at ' + width)
    } finally { await context.close() }
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

async function noDocumentOverflow(page, width, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  assert.ok(dimensions.html <= width + 1 && dimensions.body <= width + 1,
    label + ' overflow at ' + width + ': ' + JSON.stringify(dimensions))
}

test('organization and staffing match the prototype KPI/drawer structure responsively', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/organization')
      await page.getByRole('heading', { name: /Организационная структура/, level: 1 }).waitFor()

      for (const title of ['Подразделения', 'Штатные единицы', 'Занято', 'Вакантные позиции']) {
        assert.equal(await page.getByText(title, { exact: true }).count() >= 1, true, 'missing KPI: ' + title)
      }

      await page.getByRole('navigation', { name: 'Представление организационной структуры' })
        .getByRole('button', { name: 'Схема', exact: true }).click()
      const diagram = page.getByRole('region', { name: 'Схема подразделений компании' })
      await diagram.locator('.chart-company').waitFor()
      const companyTitle = await diagram.locator('.chart-company-title strong').innerText()
      assert.ok(companyTitle.trim().length > 0, 'ZIP chart must start with a real company name')
      await diagram.locator('.chart-company-metrics > span').first().waitFor()
      assert.ok(await diagram.locator('.chart-company-metrics > span').count() > 0,
        'Company root uses staffing metrics from the company-scoped API')
      const topDepartments = diagram.locator('.tree-branch--level-0 > .tree-children > .tree-branch')
      assert.ok(await topDepartments.count() > 0, 'First department tier should be visible without expanding all')
      const deeperBranches = diagram.locator('.tree-branch--level-1 > .tree-children')
      assert.equal(await deeperBranches.count(), 0, 'Deeper departments start collapsed')
      const expandAll = page.getByRole('checkbox', { name: 'Раскрыть нижестоящий уровень' })
      await expandAll.check()
      assert.ok(await deeperBranches.count() > 0, 'Global expansion reveals further departments')
      await expandAll.uncheck()
      assert.equal(await deeperBranches.count(), 0, 'Global collapse restores the compact diagram')
      const scroll = await diagram.evaluate(el => ({
        overflowX: getComputedStyle(el).overflowX,
        overflowY: getComputedStyle(el).overflowY,
      }))
      assert.equal(scroll.overflowX, 'auto')
      assert.ok(scroll.overflowY === 'clip' || scroll.overflowY === 'hidden')

      const addDepartment = page.getByRole('button', { name: /Добавить подразделение/ })
      if (await addDepartment.count()) {
        await addDepartment.click()
        const drawer = page.getByRole('dialog', { name: 'Новое подразделение' })
        await drawer.waitFor()
        assert.equal(await drawer.isVisible(), true)
        await drawer.getByRole('button', { name: 'Закрыть' }).click()
      }
      if (width === 1440) {
        const views = page.getByRole('navigation', { name: 'Представление организационной структуры' })
        await views.getByRole('button', { name: 'Таблица' }).click()
        const departments = page.getByRole('region', { name: 'Подразделения компании' })
        await departments.waitFor()
        const all = departments.locator('thead input[type="checkbox"]')
        await all.check()
        await page.getByRole('button', { name: 'Сбросить выбор' }).waitFor()
        const selectedCount = await departments.locator('tbody input[type="checkbox"]:checked').count()
        const visibleCount = await departments.locator('tbody input[type="checkbox"]').count()
        assert.ok(visibleCount > 0 && selectedCount === visibleCount,
          'Select-all must check only the currently displayed department rows')
        const downloadPromise = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Экспорт CSV' }).click()
        const download = await downloadPromise
        assert.equal(download.suggestedFilename(), 'orgstructure-selected.csv')
        await page.getByRole('button', { name: 'Сбросить выбор' }).click()
        assert.equal(await departments.locator('tbody input[type="checkbox"]:checked').count(), 0)
      }
      await noDocumentOverflow(page, width, 'organization')

      await page.goto('/staffing')
      await page.getByRole('heading', { name: 'Штатное расписание', level: 1 }).waitFor()
      const newVersion = page.getByRole('button', { name: 'Новая версия' })
      if (await newVersion.count()) {
        await newVersion.click()
        const drawer = page.getByRole('dialog', { name: 'Новая версия штатного расписания' })
        await drawer.waitFor()
        assert.equal(await drawer.isVisible(), true)
        await drawer.getByRole('button', { name: 'Закрыть' }).click()
      }

      const addLine = page.getByRole('button', { name: 'Добавить строку' })
      if (await addLine.count()) {
        await addLine.click()
        const drawer = page.getByRole('dialog', { name: 'Новая штатная единица' })
        await drawer.waitFor()
        assert.equal(await drawer.isVisible(), true)
        await drawer.getByRole('button', { name: 'Закрыть' }).click()
      }
      await noDocumentOverflow(page, width, 'staffing')
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

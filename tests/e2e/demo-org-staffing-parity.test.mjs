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

      const diagram = page.getByRole('region', { name: 'Схема подразделений компании' })
      if (await diagram.count()) {
        const scroll = await diagram.evaluate(el => ({
          overflowX: getComputedStyle(el).overflowX,
          overflowY: getComputedStyle(el).overflowY,
        }))
        assert.equal(scroll.overflowX, 'auto')
        assert.ok(scroll.overflowY === 'clip' || scroll.overflowY === 'hidden')
      }

      const addDepartment = page.getByRole('button', { name: /Добавить подразделение/ })
      if (await addDepartment.count()) {
        await addDepartment.click()
        const drawer = page.getByRole('dialog', { name: 'Новое подразделение' })
        await drawer.waitFor()
        assert.equal(await drawer.isVisible(), true)
        await drawer.getByRole('button', { name: 'Закрыть' }).click()
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

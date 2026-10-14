import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

async function assertNoOverflow(page, width, label) {
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  assert.ok(layout.html <= width + 1 && layout.body <= width + 1,
    label + ' overflow at ' + width + ': ' + JSON.stringify(layout))
}

test('employee registry prototype drawers work at mobile tablet and desktop widths', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/employees')
      await page.getByRole('heading', { name: /Реестр сотрудников/ }).waitFor()

      await page.getByRole('button', { name: 'Фильтры' }).click()
      const filters = page.getByRole('dialog', { name: 'Фильтры' })
      await filters.waitFor()
      assert.equal(await filters.getByLabel('Вид персонала').count(), 1)
      assert.equal(await filters.getByLabel('Бригада').count(), 1)
      assert.equal(await filters.getByText('Период приёма — с', { exact: true }).count(), 1)
      await filters.getByRole('button', { name: 'Отмена' }).click()

      await page.getByRole('button', { name: 'Шаблоны' }).click()
      const templates = page.getByRole('dialog', { name: 'Шаблоны' })
      await templates.waitFor()
      await templates.getByRole('tab', { name: 'Создать шаблон' }).click()
      await templates.getByText('Группировка', { exact: true }).waitFor()
      await templates.getByLabel('По категориям').check()
      await templates.getByRole('button', { name: 'Далее' }).click()

      assert.equal(await templates.getByLabel('Вид персонала').count(), 1)
      assert.equal(await templates.getByLabel('Бригада').count(), 1)
      await templates.getByRole('button', { name: 'Далее' }).click()
      await templates.getByPlaceholder('Введите название').fill('E2E шаблон ' + width)
      await templates.getByRole('button', { name: 'Создать' }).click()
      await templates.getByRole('button', { name: 'Применить' }).click()

      const add = page.getByRole('button', { name: /Добавить сотрудника/ })
      if (await add.count()) {
        await add.click()
        const employeeDrawer = page.getByRole('dialog', { name: 'Добавить сотрудника' })
        await employeeDrawer.waitFor()
        await employeeDrawer.getByRole('button', { name: 'Закрыть' }).click()
      }

      await assertNoOverflow(page, width, 'employee registry')
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

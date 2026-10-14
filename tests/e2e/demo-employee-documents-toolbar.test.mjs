import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
const employeeUrl = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000?tab=documents'
let browser

before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('employee documents workspace has prototype toolbar and stays responsive', async () => {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(employeeUrl)
      const nav = page.getByRole('navigation', { name: 'Разделы карточки сотрудника' })
      const tab = nav.getByRole('button', { name: 'Документы' })
      await tab.waitFor()
      await tab.click()

      await page.getByRole('heading', { name: 'Документы сотрудника' }).waitFor()
      assert.equal(await page.getByRole('searchbox', { name: 'Поиск документов' }).count(), 1)
      assert.equal(await page.getByRole('button', { name: /По папкам|Группировка/ }).count(), 1)
      assert.equal(await page.getByRole('button', { name: 'Настройка колонок' }).count(), 1)
      assert.equal(await page.getByRole('link', { name: 'Шаблоны' }).count(), 1)
      assert.equal(await page.getByRole('button', { name: 'Экспорт' }).count(), 1)

      const table = page.getByRole('table', { name: 'Документы сотрудника' })
      await table.waitFor()
      if (await table.locator('tbody tr').count()) {
        assert.ok((await table.locator('tbody tr.table-group').count()) >= 1)
      }

      const search = page.getByRole('searchbox', { name: 'Поиск документов' })
      await search.fill('zzzz-no-document')
      await page.getByText('Документы не добавлены').waitFor()
      await search.fill('')

      await page.getByRole('button', { name: 'Настройка колонок' }).click()
      const dialog = page.getByRole('dialog', { name: 'Настройка колонок' })
      await dialog.getByLabel('Файл').uncheck()
      await dialog.getByRole('button', { name: 'Применить' }).click()
      assert.equal(await table.getByRole('columnheader', { name: 'Файл' }).count(), 0)

      const fullscreen = page.getByRole('button', { name: 'На весь экран' })
      await fullscreen.click()
      assert.equal(await page.locator('.employee-documents-panel.is-fullscreen').count(), 1)
      await page.getByRole('button', { name: 'Выйти из полноэкранного режима' }).click()

      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      assert.ok(layout.html <= width + 1 && layout.body <= width + 1,
        'document workspace overflow at '+width+': '+JSON.stringify(layout))
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

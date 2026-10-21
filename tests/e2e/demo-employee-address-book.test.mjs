import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const employeeURL = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'

test('ZIP contacts: add, edit, select primary and archive actual address rows without affecting legacy fields', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(employeeURL)
      await page.getByRole('navigation', { name: 'Разделы карточки сотрудника' }).waitFor()
      const book = page.locator('.employee-address-book')
      await book.waitFor()
      assert.equal(await book.locator('.employee-address-row').count(), 1)
      assert.equal(await book.locator('.employee-address-primary').count(), 1)
      assert.equal(await book.getByRole('button', { name: 'Добавить адрес' }).count(), 1)
      await book.getByRole('button', { name: 'Добавить адрес' }).click()
      let editor = page.getByRole('dialog', { name: 'Добавить адрес' })
      await editor.waitFor()
      await editor.getByLabel('Тип адреса').selectOption('registration')
      await editor.getByLabel(/^Адрес/).fill('QA synthetic registration address, building 22')
      await editor.getByLabel('Подъезд').fill('C')
      await editor.getByLabel('Этаж').fill('3')
      await editor.getByLabel('Квартира').fill('44')
      await editor.getByLabel('Основной адрес').check()
      await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
      await editor.waitFor({ state: 'hidden' })
      const added = book.locator('.employee-address-row').filter({ hasText: 'QA synthetic registration address' })
      await added.waitFor()
      assert.equal(await book.locator('.employee-address-row').count(), 2)
      assert.equal(await added.locator('.employee-address-primary').count(), 1,
        'Only the newly selected address may be primary')
      assert.equal(await book.locator('.employee-address-primary').count(), 1)

      await added.getByRole('button', { name: 'Изменить адрес' }).click()
      editor = page.getByRole('dialog', { name: 'Изменить адрес' })
      await editor.waitFor()
      assert.equal(await editor.getByLabel(/^Адрес/).inputValue(),
        'QA synthetic registration address, building 22')
      await editor.getByLabel('Квартира').fill('55')
      await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
      await editor.waitFor({ state: 'hidden' })
      await added.getByText('55').waitFor()

      page.once('dialog', dialog => dialog.accept())
      await added.getByRole('button', { name: 'Архивировать адрес' }).click()
      await added.waitFor({ state: 'hidden' })
      assert.equal(await book.locator('.employee-address-row').count(), 1)
      assert.equal(await book.locator('.employee-address-primary').count(), 0,
        'Archiving a primary never silently selects another one')
      const legacy = page.locator('.employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText('Адрес проживания', { exact: true }),
      })
      assert.equal(await legacy.count(), 1, 'Legacy personal address is still displayed separately')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

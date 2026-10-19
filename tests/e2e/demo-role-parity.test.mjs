import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })
const baseURL = 'http://127.0.0.1:5173'

test('demo Roles and access shows synthetic accounts, scoped matrix and no missing API error', async () => {
  for (const width of [375, 1180]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/roles')
      await page.getByRole('heading', { name: 'Назначение ролей', exact: true }).waitFor()
      await page.getByText('Демо-администратор', { exact: true }).waitFor()
      await page.getByText('Специалист по кадрам', { exact: true }).waitFor()
      await page.getByText(/Демонстрационные учётные записи и роли/).waitFor()
      assert.equal(await page.locator('.roles-page .registry-summary-card').count(), 4)
      assert.equal(await page.getByText('Demo API route not implemented').count(), 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      assert.deepEqual(errors, [], 'Demo roles must not throw JS errors at width ' + width)

      const tabs = page.getByRole('navigation', { name: 'Разделы ролей и доступов' })
      await tabs.getByRole('button', { name: 'Права ролей' }).click()
      await page.getByRole('heading', { name: 'Права системных ролей' }).waitFor()
      await page.getByText('Демонстрационная матрица прав').waitFor()
      await tabs.getByRole('button', { name: 'Назначение ролей' }).click()
      await page.getByText('Демо-администратор', { exact: true }).waitFor()
    } finally { await context.close() }
  }
})

test('demo role edits and employee account links are clearly synthetic and revise safely', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()
  try {
    await page.goto('/roles')
    await page.getByText('Специалист по кадрам', { exact: true }).waitFor()
    const row = page.getByRole('row').filter({ hasText: 'hr@hrm.example.test' })
    await row.getByRole('button', { name: 'Действия: Специалист по кадрам' }).click()
    await page.getByRole('menuitem', { name: 'Изменить роль' }).click()
    const editor = page.getByRole('dialog', { name: 'Изменить роль' })
    await editor.getByRole('combobox', { name: 'Роль' }).selectOption('employee')
    await editor.getByRole('button', { name: 'Сохранить роль' }).click()
    await editor.waitFor({ state: 'hidden' })
    await row.getByText('Сотрудник', { exact: true }).waitFor()
    const tabs = page.getByRole('navigation', { name: 'Разделы ролей и доступов' })
    await tabs.getByRole('button', { name: 'Лог' }).click()
    await page.getByText('Роль изменена', { exact: true }).waitFor()
    await tabs.getByRole('button', { name: 'Назначение ролей' }).click()
    const user = page.getByRole('row').filter({ hasText: 'employee@hrm.example.test' })
    await user.getByRole('button', { name: 'Действия: Сотрудник' }).click()
    await page.getByRole('menuitem', { name: 'Кабинет сотрудника' }).click()
    const link = page.getByRole('dialog', { name: 'Кабинет сотрудника' })
    await link.getByRole('combobox', { name: 'Кадровая запись' })
      .locator('option').nth(1).waitFor({ state: 'attached' })
    await link.getByRole('combobox', { name: 'Кадровая запись' }).selectOption({ index: 1 })
    await link.getByRole('button', { name: 'Сохранить связь' }).click()
    await link.getByText('Связь учётной записи сохранена.').waitFor()
    assert.equal(await page.getByText('Demo API route not implemented').count(), 0)
  } finally { await context.close() }
})

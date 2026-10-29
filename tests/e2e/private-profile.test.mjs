import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HR saves personal and military data in Laravel from a mobile employee profile', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 900 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()

    await page.goto('/employees/11111111-1111-4111-8111-111111111111/77777777-7777-4777-8777-777777777777')
    await page.getByRole('heading', { name: 'Основные личные данные' }).waitFor()
    async function editField(sectionTitle, fieldName, nextValue) {
      const section = page.locator('.employee-profile-section').filter({
        has: page.getByRole('heading', { name: sectionTitle, exact: true }),
      })
      const field = section.locator('.employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText(fieldName, { exact: true }),
      })
      await field.getByRole('button', { name: 'Изменить поле: ' + fieldName }).click()
      const editor = field.locator('form.employee-inline-field-form')
      await editor.waitFor()
      assert.equal(await editor.locator('input,select').count(), 1)
      await editor.getByLabel(fieldName, { exact: true }).fill(nextValue)
      await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
      await field.getByText(nextValue, { exact: true }).waitFor()
    }

    await editField('Основные личные данные', 'Гражданство', 'GE')
    await editField('Место рождения', 'Место рождения', 'Synthetic City')
    await editField('Контакты и адреса', 'Адрес регистрации', 'Synthetic Address')
    assert.equal(await page.getByRole('dialog', { name: 'Личные данные и контакты' }).count(), 0)

    await page.reload()
    await page.getByRole('heading', { name: 'Основные личные данные' }).waitFor()
    await page.getByText('Synthetic City', { exact: true }).waitFor()
    await page.getByText('Synthetic Address', { exact: true }).waitFor()
    await editField('Воинский учёт', 'Статус воинского учёта', 'liable')
    await editField('Воинский учёт', 'Категория учёта', 'reserve')
    await editField('Воинский учёт', 'Военный билет', 'SYNTHETIC-REF')
    await page.reload()
    await page.getByRole('heading', { name: 'Воинский учёт' }).waitFor()
    await page.getByText('SYNTHETIC-REF', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const employeeURL = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('employee card pencils edit only the selected field and leave computed fields informative at three widths', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(employeeURL)
      const nav = page.getByRole('navigation', { name: 'Разделы карточки сотрудника' })
      await nav.waitFor()
      assert.equal(await page.getByRole('button', { name: 'Изменить карточку' }).count(), 0)
      await page.getByText('Информационные поля — только просмотр').waitFor()
      const surname = page.locator('.identity-name-grid .employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText('Фамилия', { exact: true }),
      })
      assert.equal(await surname.getAttribute('data-field-state'), 'editable')
      await surname.getByRole('button', { name: 'Изменить поле: Фамилия' }).click()
      const editor = surname.locator('form.employee-inline-field-form')
      await editor.waitFor()
      assert.equal(await editor.locator('input').count(), 1, 'No duplicate full-card editor inputs')
      assert.equal(await editor.getByLabel('Фамилия').inputValue() !== '', true)
      await editor.getByRole('button', { name: 'Отмена' }).click()
      await editor.waitFor({ state: 'hidden' })

      const age = page.locator('.employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText('Возраст', { exact: true }),
      })
      await age.waitFor()
      assert.equal(await age.getAttribute('data-field-state'), 'informative')
      assert.equal(await age.locator('button,input,select,textarea').count(), 0)
      const valueStyles = await age.locator('strong').evaluate(node => ({
        borderWidth: getComputedStyle(node).borderTopWidth,
        boxShadow: getComputedStyle(node).boxShadow,
      }))
      assert.equal(valueStyles.borderWidth, '0px')
      assert.equal(valueStyles.boxShadow, 'none')

      const email = page.locator('.employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText('Email', { exact: true }),
      }).first()
      await email.getByRole('button', { name: 'Изменить поле: Email' }).click()
      const emailEditor = email.locator('form.employee-inline-field-form')
      const existing = await emailEditor.getByLabel('Email').inputValue()
      await emailEditor.getByLabel('Email').fill('cancelled-edit@example.test')
      page.once('dialog', async dialog => {
        assert.match(dialog.message(), /несохранённ/)
        await dialog.dismiss()
      })
      await nav.getByRole('button', { name: 'Организационные данные' }).click()
      assert.equal(await emailEditor.isVisible(), true, 'Rejecting discard keeps the draft in place')
      await emailEditor.getByRole('button', { name: 'Отмена' }).click()
      await email.getByRole('button', { name: 'Изменить поле: Email' }).click()
      assert.equal(await email.locator('input').inputValue(), existing)
      await email.locator('form').getByRole('button', { name: 'Отмена' }).click()

      await nav.getByRole('button', { name: 'Организационные данные' }).click()
      const department = page.locator('.employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText('Подразделение', { exact: true }),
      })
      await department.waitFor()
      assert.equal(await department.getAttribute('data-field-state'), 'informative')
      assert.equal(await department.locator('button').count(), 0, 'Staffing change requires an appointment')
      const workplace = page.locator('.employee-data-field').filter({
        has: page.locator('.employee-data-label').getByText('Объект', { exact: true }),
      })
      assert.equal(await workplace.getAttribute('data-field-state'), 'editable')
      await workplace.getByRole('button', { name: 'Изменить поле: Объект' }).click()
      assert.equal(await workplace.locator('form input').count(), 1)
      await workplace.locator('form').getByRole('button', { name: 'Отмена' }).click()

      await nav.getByRole('button', { name: 'Расчёты и начисления' }).click()
      const payroll = page.locator('.employee-profile-section').filter({
        has: page.getByRole('heading', { name: 'Условия оплаты' }),
      })
      await payroll.waitFor()
      assert.equal(await payroll.locator('[data-field-state="editable"]').count(), 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      assert.deepEqual(errors, [])
    } finally { await context.close() }
  }
})

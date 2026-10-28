import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const employeeURL = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('employee card distinguishes actionable fields from non-editable projections at three breakpoints', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(employeeURL)
      const nav = page.getByRole('navigation', { name: 'Разделы карточки сотрудника' })
      await nav.waitFor()
      await page.getByText('Информационные поля — только просмотр').waitFor()
      const familyName = page.locator('.identity-name-fields .read-field').filter({ hasText: 'Фамилия' })
      assert.equal(await familyName.getAttribute('data-field-state'), 'editable')
      await familyName.getByRole('button', { name: 'Изменить поле: Фамилия' }).click()
      const identityEditor = page.locator('#employee-card-edit-form')
      await identityEditor.waitFor()
      const identityDom = await identityEditor.evaluate(form => ({
        inputs: form.querySelectorAll('input').length,
        labels: [...form.querySelectorAll('label')].map(label => label.textContent?.trim()),
        content: form.textContent?.slice(0,500),
      }))
      assert.ok(identityDom.inputs >= 4 && identityDom.labels.some(label => /^Фамилия(?:\s*\*)?$/.test(label || '')),
        'An editable name must open an inline employee form: ' + JSON.stringify(identityDom))
      await page.getByRole('button', { name: 'Отменить', exact: true }).click()
      await identityEditor.waitFor({ state: 'hidden' })
      const age = page.locator('.employee-data-field').filter({ has: page.locator('.employee-data-label').getByText('Возраст', { exact: true }) })
      await age.waitFor()
      assert.equal(await age.getAttribute('data-field-state'), 'informative')
      assert.equal(await age.locator('button').count(), 0, 'Computed age cannot have an edit action')
      assert.equal(await age.locator('input,select,textarea').count(), 0, 'Read-only mode never renders fake inputs')
      const valueStyles = await age.locator('strong').evaluate(el => ({
        borderWidth: getComputedStyle(el).borderTopWidth,
        boxShadow: getComputedStyle(el).boxShadow,
      }))
      assert.equal(valueStyles.borderWidth, '0px', 'Informational values must not look like inputs')
      assert.equal(valueStyles.boxShadow, 'none')

      const email = page.locator('.employee-data-field').filter({ has: page.locator('.employee-data-label').getByText('Email', { exact: true }) })
      await email.waitFor()
      assert.equal(await email.getAttribute('data-field-state'), 'editable')
      const edit = email.getByRole('button', { name: 'Изменить поле: Email' })
      await edit.click()
      await identityEditor.waitFor()
      const existing = await identityEditor.getByLabel('Email', { exact: true }).inputValue()
      await identityEditor.getByLabel('Email', { exact: true }).fill('cancelled-edit@example.test')
      page.once('dialog', async dialog => { assert.match(dialog.message(), /несохранённые/); await dialog.dismiss() })
      await page.getByRole('button', { name: 'Отменить', exact: true }).click()
      assert.equal(await identityEditor.isVisible(), true, 'Declining discard keeps the draft')
      page.once('dialog', async dialog => { await dialog.accept() })
      await page.getByRole('button', { name: 'Отменить', exact: true }).click()
      await identityEditor.waitFor({ state: 'hidden' })
      await edit.click()
      await identityEditor.waitFor()
      assert.equal(await identityEditor.getByLabel('Email', { exact: true }).inputValue(), existing,
        'Cancelling never persists the draft')
      await page.getByRole('button', { name: 'Отменить', exact: true }).click()

      await nav.getByRole('button', { name: 'Организационные данные' }).click()
      const department = page.locator('.employee-data-field').filter({ has: page.locator('.employee-data-label').getByText('Подразделение', { exact: true }) })
      await department.waitFor()
      assert.equal(await department.getAttribute('data-field-state'), 'informative')
      assert.equal(await department.locator('button').count(), 0,
        'Department changes use audited personnel assignments, not direct field editing')
      const workplace = page.locator('.employee-data-field').filter({ has: page.locator('.employee-data-label').getByText('Объект', { exact: true }) })
      assert.equal(await workplace.getAttribute('data-field-state'), 'editable')
      await workplace.getByRole('button', { name: 'Изменить поле: Объект' }).click()
      await identityEditor.waitFor()
      await identityEditor.getByLabel('Объект', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Отменить', exact: true }).click()

      await nav.getByRole('button', { name: 'Расчёты и начисления' }).click()
      const payroll = page.locator('.employee-profile-section').filter({ has: page.getByRole('heading', { name: 'Условия оплаты' }) })
      await payroll.waitFor()
      assert.equal(await payroll.locator('[data-field-state="editable"]').count(), 0,
        'Payroll projections are informative until a real approved payroll write contract exists')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

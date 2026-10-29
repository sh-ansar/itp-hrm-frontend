import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const employeeURL = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('ZIP personal tab: contact order, accessible legacy addresses and normalized identity documents', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    try {
      await page.goto(employeeURL)
      await page.getByRole('navigation', { name: 'Разделы карточки сотрудника' }).waitFor()

      const contacts = page.locator('.employee-profile-section').filter({
        has: page.getByRole('heading', { name: 'Контакты и адреса', exact: true }),
      })
      await contacts.waitFor()
      assert.deepEqual(await contacts.locator('.employee-data-grid').first()
        .locator('.employee-data-label').allTextContents(), ['Логин', 'Email', 'Телефон'],
        'ZIP contact header groups login, email and phone')
      assert.equal(await contacts.locator('.employee-address-book .employee-address-row').count(), 1)
      assert.equal(await contacts.getByRole('button', { name: 'Дополнительные контакты и прежние адреса' }).count(), 0)
      const oldAddresses = contacts.locator('.employee-legacy-contact-section')
      await oldAddresses.getByText('Адрес проживания', { exact: true }).waitFor()
      assert.ok(await oldAddresses.getByText('Адрес регистрации', { exact: true }).count() > 0)

      const documentSection = page.locator('.employee-profile-section').filter({
        has: page.getByRole('heading', { name: 'Документы, удостоверяющие личность', exact: true }),
      })
      await documentSection.waitFor()
      const cards = documentSection.locator('.employee-identity-record')
      assert.equal(await cards.count(), 2)
      assert.equal(await cards.locator('.employee-identity-primary').count(), 1)
      assert.ok((await cards.first().innerText()).includes('••••-001'), 'Primary document number is masked')
      assert.ok((await cards.nth(1).innerText()).includes('••••-002'), 'Secondary document number is masked')
      assert.equal(await documentSection.getByText('ID450000', { exact: true }).count(), 0,
        'Never project stale legacy document numbers when normalized data is available')
      assert.equal(await cards.getByText('QA-DOC-PRIMARY-001', { exact: true }).count(), 0)
      assert.equal(await cards.getByText('QA-DOC-SECONDARY-002', { exact: true }).count(), 0)
      assert.equal(await cards.locator('[data-field-state="editable"]').count(), 0,
        'Demo without private-profile write permission may only display sensitive documents')
      assert.equal(await cards.locator('button').count(), 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false,
        'Personal tab must not overflow viewport width ' + width)
      assert.deepEqual(pageErrors, [])
    } finally { await context.close() }
  }
})

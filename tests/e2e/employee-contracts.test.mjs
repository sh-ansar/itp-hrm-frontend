import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
const email = 'synthetic-e2e@example.test'
const password = 'SyntheticE2E-Only!2026'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'

let browser

before(async () => {
  browser = await chromium.launch({ headless: true })
})

after(async () => {
  await browser?.close()
})

async function signIn(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(password)
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Войти' }).click(),
  ])
  assert.equal(response.status(), 200)
}

test('HR creates and edits an employment contract and registry expiry KPI becomes live', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  try {
    await signIn(page)
    await page.goto(`/employees/${company}/${employee}?tab=employment`)
    await page.getByRole('heading', { name: /Synthetic Employee/ }).waitFor()
    await page.getByRole('button', { name: 'Новый договор', exact: true }).click()

    let dialog = page.getByRole('dialog', { name: 'Новый трудовой договор' })
    await dialog.waitFor()
    await dialog.getByLabel('Номер договора', { exact: true }).fill('E2E-TD-001')
    await dialog.getByLabel('Тип договора', { exact: true }).selectOption('fixed_term')
    await dialog.getByLabel('Вид занятости', { exact: true }).selectOption('full_time')
    await dialog.getByLabel('Дата подписания', { exact: true }).fill('2026-10-01')
    await dialog.getByLabel('Действует с', { exact: true }).fill('2026-10-01')
    await dialog.getByLabel('Действует до', { exact: true }).fill('2026-10-30')
    await dialog.getByLabel('Испытательный срок до', { exact: true }).fill('2026-10-20')
    await dialog.getByLabel('Основание / приказ', { exact: true }).fill('E2E приказ № 1')

    const [createResponse] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith(`/employees/${employee}/contracts`) && r.request().method() === 'POST'),
      dialog.getByRole('button', { name: 'Создать договор', exact: true }).click(),
    ])
    assert.equal(createResponse.status(), 201)

    await page.getByText('E2E-TD-001', { exact: true }).waitFor()
    await page.getByText('Срочный', { exact: true }).first().waitFor()

    await page.goto('/employees')
    await page.getByText('Истекающие договоры', { exact: true }).waitFor()
    const expiryCard = page.locator('.registry-metrics').filter({ hasText: 'Истекающие договоры' })
    await page.waitForFunction(() => {
      const cards = [...document.querySelectorAll('.registry-metrics *')]
      return cards.some(node => node.textContent?.includes('Истекающие договоры'))
    })
    const registryApi = await page.evaluate(async companyId => {
      const response = await fetch(`/api/v1/companies/${companyId}/employees?status=active&per_page=25`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.json() }
    }, company)
    assert.equal(registryApi.status, 200)
    assert.equal(registryApi.body.meta.registry_summary.expiring_contracts, 1)
    const row = registryApi.body.data.find(item => item.id === employee)
    assert.ok(row)
    assert.equal(row.contract_type, 'fixed_term')
    assert.equal(row.contract_valid_to, '2026-10-30')
    assert.ok(await expiryCard.count() >= 1)

    await page.goto(`/employees/${company}/${employee}?tab=employment`)
    const contractRow = page.getByRole('row').filter({ hasText: 'E2E-TD-001' })
    await contractRow.waitFor()
    await contractRow.getByRole('button', { name: 'Изменить', exact: true }).click()

    dialog = page.getByRole('dialog', { name: 'Редактировать трудовой договор' })
    await dialog.waitFor()
    await dialog.getByLabel('Номер договора', { exact: true }).fill('E2E-TD-001A')
    await dialog.getByLabel('Действует до', { exact: true }).fill('2026-11-05')
    const [updateResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/contracts/') && r.request().method() === 'PUT'),
      dialog.getByRole('button', { name: 'Сохранить изменения', exact: true }).click(),
    ])
    assert.equal(updateResponse.status(), 200)

    await page.getByText('E2E-TD-001A', { exact: true }).waitFor()
    await page.reload()
    await page.getByText('E2E-TD-001A', { exact: true }).waitFor()

    const contractsApi = await page.evaluate(async ({ companyId, employeeId }) => {
      const response = await fetch(`/api/v1/companies/${companyId}/employees/${employeeId}/contracts`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.json() }
    }, { companyId: company, employeeId: employee })
    assert.equal(contractsApi.status, 200)
    assert.equal(contractsApi.body.data[0].contract_number, 'E2E-TD-001A')
    assert.equal(contractsApi.body.data[0].valid_to, '2026-11-05')
    assert.equal(contractsApi.body.data[0].revision, 2)
  } finally {
    await context.close()
  }
})

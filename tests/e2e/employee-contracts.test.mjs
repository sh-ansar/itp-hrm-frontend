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
  const dateOffset = days => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }
  const startedOn = dateOffset(-1)
  const expiresOn = dateOffset(14)
  const revisedExpiry = dateOffset(45)
  try {
    await signIn(page)
    await page.goto(`/employees/${company}/${employee}?tab=employment`)
    await page.getByRole('heading', { name: /Synthetic Employee/ }).waitFor()
    await page.getByRole('button', { name: 'Новый договор', exact: true }).click()

    let dialog = page.getByRole('dialog', { name: 'Новый трудовой договор' })
    await dialog.waitFor()
    await dialog.getByRole('textbox', { name: 'Номер договора', exact: true }).fill('E2E-TD-001')
    await dialog.getByRole('combobox', { name: 'Тип договора', exact: true }).selectOption('fixed_term')
    await dialog.getByLabel('Вид занятости', { exact: true }).selectOption('full_time')
    await dialog.getByLabel('Дата подписания', { exact: true }).fill(startedOn)
    await dialog.getByLabel(/^Действует с(?: \*)?$/).fill(startedOn)
    await dialog.getByLabel(/^Действует до(?: \*)?$/).fill(expiresOn)
    await dialog.getByLabel('Испытательный срок до', { exact: true }).fill(dateOffset(7))
    await dialog.getByLabel('Основание / приказ', { exact: true }).fill('E2E приказ № 1')

    const [createResponse] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith(`/employees/${employee}/contracts`) && r.request().method() === 'POST'),
      dialog.getByRole('button', { name: 'Создать договор', exact: true }).click(),
    ])
    assert.equal(createResponse.status(), 201)

    await page.getByRole('row').filter({ hasText: 'E2E-TD-001' }).waitFor()
    await page.getByText('Срочный', { exact: true }).first().waitFor()

    await page.goto('/employees')
    await page.getByText('Истекающие договоры', { exact: true }).waitFor()
    const expiryCard = page.locator('.registry-summary-card').filter({ hasText: 'Истекающие договоры' })
    await page.waitForFunction(() => {
      const card = [...document.querySelectorAll('.registry-summary-card')]
        .find(node => node.textContent?.includes('Истекающие договоры'))
      return card?.querySelector('.registry-summary-value')?.textContent?.trim() === '1'
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
    assert.equal(row.contract_valid_to, expiresOn)
    assert.equal(await expiryCard.locator('.registry-summary-value').textContent(), '1')

    await page.goto(`/employees/${company}/${employee}?tab=employment`)
    const contractRow = page.getByRole('row').filter({ hasText: 'E2E-TD-001' })
    await contractRow.waitFor()
    await contractRow.getByRole('button', { name: 'Изменить', exact: true }).click()

    dialog = page.getByRole('dialog', { name: 'Редактировать трудовой договор' })
    await dialog.waitFor()
    await dialog.getByRole('textbox', { name: 'Номер договора', exact: true }).fill('E2E-TD-001A')
    await dialog.getByLabel(/^Действует до(?: \*)?$/).fill(revisedExpiry)
    const [updateResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/contracts/') && r.request().method() === 'PUT'),
      dialog.getByRole('button', { name: 'Сохранить изменения', exact: true }).click(),
    ])
    assert.equal(updateResponse.status(), 200)

    await page.getByRole('row').filter({ hasText: 'E2E-TD-001A' }).waitFor()
    await page.reload()
    await page.getByRole('row').filter({ hasText: 'E2E-TD-001A' }).waitFor()

    const contractsApi = await page.evaluate(async ({ companyId, employeeId }) => {
      const response = await fetch(`/api/v1/companies/${companyId}/employees/${employeeId}/contracts`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.json() }
    }, { companyId: company, employeeId: employee })
    assert.equal(contractsApi.status, 200)
    assert.equal(contractsApi.body.data[0].contract_number, 'E2E-TD-001A')
    assert.equal(contractsApi.body.data[0].valid_to, revisedExpiry)
    assert.equal(contractsApi.body.data[0].revision, 2)

    await page.goto('/employees')
    for (const [days, expected] of [['30', '0'], ['60', '1'], ['90', '1'], ['30', '0']]) {
      const card = page.locator('.registry-summary-card').filter({ hasText: 'Истекающие договоры' })
      const select = card.getByRole('combobox', { name: 'Период', exact: true })
      if (await select.inputValue() !== days) {
        const [response] = await Promise.all([
          page.waitForResponse(r => r.url().includes('/employees?')
            && new URL(r.url()).searchParams.get('contract_expiry_days') === days),
          select.selectOption(days),
        ])
        assert.equal(response.status(), 200)
        assert.equal((await response.json()).meta.registry_summary.expiring_contracts_days, Number(days))
      }
      await page.waitForFunction(expected => {
        const card = [...document.querySelectorAll('.registry-summary-card')]
          .find(node => node.textContent?.includes('Истекающие договоры'))
        return card?.querySelector('.registry-summary-value')?.textContent?.trim() === expected
      }, expected)
      assert.equal(await card.locator('.registry-summary-value').textContent(), expected)
    }

  } finally {
    await context.close()
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('heading', { name: 'Главная' }).waitFor()
}

test('employee prototype register has real status filter, archive, grouping and column controls', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  try {
    await login(page)
    await page.goto('/employees')
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    await page.getByRole('row', { name: /E2E-001/ }).waitFor({ timeout: 15000 })
    const table = page.getByRole('table', { name: 'Реестр сотрудников выбранной компании' })
    assert.equal(await table.getByRole('columnheader', { name: 'Дата рождения' }).count(), 1)
    assert.equal(await table.getByRole('columnheader', { name: 'Подразделение' }).count(), 1)

    await page.getByRole('button', { name: 'Группировка' }).click()
    await page.getByRole('menuitem', { name: 'По подразделениям' }).click()
    await page.getByText(/Группировка: По подразделениям/).waitFor()
    assert.ok((await table.locator('tbody tr.table-group').count()) >= 1)

    await page.getByRole('button', { name: 'Настройка колонок', exact: true }).click()
    await page.locator('.column-options').getByLabel('Подразделение').uncheck()
    await page.getByRole('dialog', { name: 'Настройка колонок' }).getByRole('button', { name: 'Применить' }).click()
    assert.equal(await table.getByRole('columnheader', { name: 'Подразделение' }).count(), 0)
    await page.getByRole('button', { name: 'Настройка колонок', exact: true }).click()
    await page.locator('.column-options').getByLabel('Подразделение').check()
    await page.getByRole('dialog', { name: 'Настройка колонок' }).getByRole('button', { name: 'Применить' }).click()
    assert.equal(await table.getByRole('columnheader', { name: 'Подразделение' }).count(), 1)

    await page.getByRole('button', { name: 'Архив сотрудников' }).click()
    await page.waitForURL(/status=archived/)
    await page.getByRole('heading', { name: /Архив сотрудников/ }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

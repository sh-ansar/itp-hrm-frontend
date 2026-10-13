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
  await page.getByRole('heading', { name: 'Обзор системы' }).waitFor()
}

test('HR creates moves renames and deletes an unused department at mobile width', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()

  try {
    await login(page)
    await page.goto('/organization')
    await page.getByRole('heading', { name: 'Организационная структура' }).waitFor()

    await page.getByRole('button', { name: 'Добавить подразделение' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Новое подразделение' })
    await createDialog.waitFor()
    await createDialog.getByLabel('Название подразделения').fill('E2E Team')
    await createDialog.getByLabel('Родительское подразделение').selectOption('33333333-3333-4333-8333-333333333333')
    await createDialog.getByRole('button', { name: 'Добавить подразделение' }).click()

    const createdRow = page.getByRole('row', { name: /E2E Team/ })
    await createdRow.waitFor()
    assert.match(await createdRow.innerText(), /Visible Finance/)

    await createdRow.getByRole('button', { name: 'Изменить' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Изменить подразделение' })
    await editDialog.waitFor()
    await editDialog.getByLabel('Название подразделения').fill('E2E Team Renamed')
    await editDialog.getByLabel('Родительское подразделение').selectOption('55555555-5555-4555-8555-555555555555')
    await editDialog.getByRole('button', { name: 'Сохранить изменения' }).click()

    const renamedRow = page.getByRole('row', { name: /E2E Team Renamed/ })
    await renamedRow.waitFor()
    assert.match(await renamedRow.innerText(), /Visible Finance Child/)

    await renamedRow.getByRole('button', { name: 'Удалить' }).click()
    const deleteDialog = page.getByRole('dialog', { name: 'Удалить подразделение' })
    await deleteDialog.waitFor()
    await deleteDialog.getByRole('button', { name: 'Удалить' }).click()

    await page.getByText('E2E Team Renamed').waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

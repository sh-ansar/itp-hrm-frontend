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

test('HR creates edits and deletes an unused position directory record', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()

  try {
    await login(page)
    await page.goto('/directories')
    await page.getByRole('heading', { name: 'Справочники' }).waitFor()

    await page.getByRole('button', { name: 'Добавить должность' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Новая должность' })
    await createDialog.waitFor()
    await createDialog.getByLabel('Название должности').fill('E2E Analyst')
    await createDialog.getByRole('button', { name: 'Добавить должность' }).click()

    const createdRow = page.locator('.position-card').filter({ hasText: 'E2E Analyst' })
    await createdRow.waitFor()

    await createdRow.getByRole('button', { name: /Изменить должность/ }).click()
    const editDialog = page.getByRole('dialog', { name: 'Изменить должность' })
    await editDialog.waitFor()
    await editDialog.getByLabel('Название должности').fill('E2E Senior Analyst')
    await editDialog.getByRole('button', { name: 'Сохранить изменения' }).click()

    const renamedRow = page.locator('.position-card').filter({ hasText: 'E2E Senior Analyst' })
    await renamedRow.waitFor()

    await renamedRow.getByRole('button', { name: /Удалить должность/ }).click()
    const deleteDialog = page.getByRole('dialog', { name: 'Удалить должность' })
    await deleteDialog.waitFor()
    await deleteDialog.getByRole('button', { name: /Удалить должность/ }).click()

    await page.locator('.position-card').filter({ hasText: 'E2E Senior Analyst' }).waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

import { test, before, after } from 'node:test'
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

test('HR creates and edits an employee master record from the redesigned UI', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()

  try {
    await login(page)
    await page.goto('/employees')
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()

    await page.getByRole('button', { name: 'Добавить сотрудника' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Новый сотрудник' })
    await createDialog.waitFor()
    await createDialog.getByLabel('Табельный номер').fill('E2E-NEW-01')
    await createDialog.getByLabel('Фамилия').fill('Новый')
    await createDialog.getByLabel('Имя').fill('Сотрудник')
    await createDialog.getByLabel('Отчество').fill('Тестовый')
    await createDialog.getByRole('button', { name: 'Добавить сотрудника' }).click()

    await page.getByRole('heading', { name: 'Карточка сотрудника' }).waitFor()
    await page.getByText('Новый Сотрудник Тестовый').waitFor()

    await page.getByRole('button', { name: 'Изменить карточку' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Основные данные сотрудника' })
    await editDialog.waitFor()
    assert.equal(await editDialog.getByLabel('Табельный номер').inputValue(), 'E2E-NEW-01')
    await editDialog.getByLabel('Фамилия').fill('Обновлённый')
    await editDialog.getByRole('button', { name: 'Сохранить карточку' }).click()

    await page.getByText('Обновлённый Сотрудник Тестовый').waitFor()

    await page.goto('/employees')
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    await page.getByLabel('Поиск').fill('E2E-NEW-01')
    await page.getByRole('button', { name: 'Найти' }).click()
    const resultRow = page.getByRole('row', { name: /E2E-NEW-01/ })
    await resultRow.waitFor()
    assert.match(await resultRow.innerText(), /Обновлённый Сотрудник Тестовый/)
    assert.match(await resultRow.innerText(), /Без назначения/)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

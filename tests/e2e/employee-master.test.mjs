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
  await page.getByRole('heading', { name: 'Главная' }).waitFor()
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
    const createDialog = page.getByRole('dialog', { name: 'Добавить сотрудника' })
    await createDialog.waitFor()
    await createDialog.getByLabel('Табельный номер').fill('E2E-NEW-01')
    await createDialog.getByLabel('Фамилия').fill('Новый')
    await createDialog.getByLabel('Имя').fill('Сотрудник')
    await createDialog.getByLabel('Отчество').fill('Тестовый')
    await createDialog.getByLabel('Дата рождения').fill('1990-06-01')
    await createDialog.getByLabel('Пол', { exact: true }).selectOption('female')
    await createDialog.getByLabel('Email', { exact: true }).fill('synthetic-master@example.test')
    await createDialog.getByLabel('Телефон', { exact: true }).fill('+77770000000')
    await createDialog.getByLabel('Адрес', { exact: true }).fill('Synthetic Street')
    await createDialog.getByLabel('Объект', { exact: true }).fill('Synthetic Site')
    await createDialog.getByLabel('Рабочая зона').fill('Synthetic Zone')
    await createDialog.getByLabel('Бригада', { exact: true }).fill('Synthetic Team')
    await createDialog.getByLabel('Непосредственный руководитель').fill('Synthetic Supervisor')
    await createDialog.getByRole('button', { name: 'Добавить сотрудника' }).click()

    await page.locator('.employee-page-heading h1').waitFor()
    await page.locator('.employee-page-heading h1').filter({ hasText: 'Новый Сотрудник Тестовый' }).waitFor()

    await page.getByRole('button', { name: 'Изменить карточку' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Основные данные сотрудника' })
    await editDialog.waitFor()
    assert.equal(await editDialog.getByLabel('Табельный номер').inputValue(), 'E2E-NEW-01')
    assert.equal(await editDialog.getByLabel('Дата рождения').inputValue(), '1990-06-01')
    assert.equal(await editDialog.getByLabel('Email', { exact: true }).inputValue(), 'synthetic-master@example.test')
    assert.equal(await editDialog.getByLabel('Бригада', { exact: true }).inputValue(), 'Synthetic Team')
    await editDialog.getByLabel('Фамилия').fill('Обновлённый')
    await editDialog.getByRole('button', { name: 'Сохранить карточку' }).click()

    await page.locator('.employee-page-heading h1').filter({ hasText: 'Обновлённый Сотрудник Тестовый' }).waitFor()

    await page.reload()
    await page.getByRole('button', { name: 'Изменить карточку' }).click()
    await editDialog.waitFor()
    assert.equal(await editDialog.getByLabel('Телефон', { exact: true }).inputValue(), '+77770000000')
    await editDialog.getByLabel('Email', { exact: true }).fill('')
    await editDialog.getByRole('button', { name: 'Сохранить карточку' }).click()
    await editDialog.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'История изменений', exact: true }).click()
    await page.getByRole('cell', { name: 'Создана карточка сотрудника', exact: true }).waitFor()
    assert.equal(await page.getByRole('cell', { name: 'Изменены данные сотрудника', exact: true }).count(), 2)
    await page.getByRole('button', { name: 'Личные данные', exact: true }).click()
    await page.getByRole('button', { name: 'Изменить карточку' }).click()
    await editDialog.waitFor()
    assert.equal(await editDialog.getByLabel('Email', { exact: true }).inputValue(), '')
    assert.equal(await editDialog.getByLabel('Телефон', { exact: true }).inputValue(), '+77770000000')
    await editDialog.getByRole('button', { name: 'Отмена', exact: true }).click()

    await page.goto('/employees')
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    // New employees have no active assignment and must not appear in the active-only view.
    await page.getByRole('button', { name: 'Фильтры' }).click()
    await page.getByLabel('Статус сотрудника').selectOption('unassigned')
    await page.getByRole('searchbox', { name: 'Поиск в реестре' }).fill('E2E-NEW-01')
    await page.getByRole('searchbox', { name: 'Поиск в реестре' }).press('Enter')
    const resultRow = page.locator('.employee-mobile-card').filter({ hasText: 'E2E-NEW-01' })
    await resultRow.waitFor()
    assert.match(await resultRow.innerText(), /Обновлённый Сотрудник Тестовый/)
    assert.match(await resultRow.innerText(), /Без назначения/)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

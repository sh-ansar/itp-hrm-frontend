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

    assert.equal(await page.getByRole('button', { name: 'Изменить карточку' }).count(), 0)
    const surname = page.locator('.identity-name-grid .employee-data-field').filter({ hasText: 'Фамилия' })
    await surname.getByRole('button', { name: 'Изменить поле: Фамилия' }).click()
    const form = surname.locator('form.employee-inline-field-form')
    assert.equal(await form.getByLabel('Фамилия').inputValue(), 'Новый')
    assert.equal(await form.locator('input').count(), 1)
    await form.getByLabel('Фамилия').fill('Обновлённый')
    await form.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.locator('.employee-page-heading h1').filter({ hasText: 'Обновлённый Сотрудник Тестовый' }).waitFor()

    await page.reload()
    const email = page.locator('.employee-data-field').filter({
      has: page.locator('.employee-data-label').getByText('Email', { exact: true }),
    }).first()
    await email.waitFor()
    await email.getByRole('button', { name: 'Изменить поле: Email' }).click()
    const emailForm = email.locator('form.employee-inline-field-form')
    assert.equal(await emailForm.getByLabel('Email').inputValue(), 'synthetic-master@example.test')
    await emailForm.getByLabel('Email').fill('')
    await emailForm.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.getByRole('button', { name: 'История изменений', exact: true }).click()
    await page.getByRole('cell', { name: 'Создана карточка сотрудника', exact: true }).waitFor()
    assert.equal(await page.getByRole('cell', { name: 'Изменены данные сотрудника', exact: true }).count(), 2)
    await page.getByRole('button', { name: 'Личные данные', exact: true }).click()
    const currentEmail = page.locator('.employee-data-field').filter({
      has: page.locator('.employee-data-label').getByText('Email', { exact: true }),
    }).first()
    await currentEmail.waitFor()
    assert.match(await currentEmail.innerText(), /—/)
    const phone = page.locator('.employee-data-field').filter({
      has: page.locator('.employee-data-label').getByText('Телефон', { exact: true }),
    }).first()
    assert.match(await phone.innerText(), /77770000000/)
    assert.match(await page.locator('.identity-short-facts').innerText(), /Email/)

    await page.goto('/employees')
    await page.getByRole('heading', { name: 'Реестр сотрудников' }).waitFor()
    // New employees have no active assignment and must not appear in the active-only view.
    await page.getByRole('button', { name: 'Фильтры' }).click()
    const filtersDrawer = page.getByRole('dialog', { name: 'Фильтры' })
    await filtersDrawer.getByLabel('Статус сотрудника').selectOption('unassigned')
    await filtersDrawer.getByRole('button', { name: 'Применить' }).click()
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

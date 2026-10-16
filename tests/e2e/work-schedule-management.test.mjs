import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
const email = 'synthetic-e2e@example.test'
const password = 'SyntheticE2E-Only!2026'

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

test('HR creates, edits and assigns a work schedule through the real UI', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  try {
    await signIn(page)
    await page.goto('/timesheets')
    await page.getByRole('heading', { name: 'Графики и табель' }).waitFor()
    await page.getByRole('button', { name: 'Графики работы', exact: true }).click()

    await page.getByRole('button', { name: 'Новый график', exact: true }).click()
    let drawer = page.getByRole('dialog', { name: 'Новый график' })
    await drawer.waitFor()

    await drawer.getByLabel('Код', { exact: true }).fill('E2E-5X2')
    await drawer.getByLabel('Наименование', { exact: true }).fill('E2E стандарт 5/2')
    await drawer.getByLabel('Тип графика', { exact: true }).selectOption('standard')
    await drawer.getByLabel('Рабочее время', { exact: true }).fill('09:00–18:00')
    await drawer.getByLabel('Часов в неделю', { exact: true }).fill('40')

    const [createResponse] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith('/worktime/schedules') && r.request().method() === 'POST'),
      drawer.getByRole('button', { name: 'Создать график', exact: true }).click(),
    ])
    assert.equal(createResponse.status(), 201)
    await drawer.getByText('График создан.', { exact: true }).waitFor()
    await drawer.locator('.drawer-footer').getByRole('button', { name: 'Закрыть', exact: true }).click()

    const row = page.getByRole('row').filter({ hasText: 'E2E стандарт 5/2' })
    await row.waitFor()
    assert.match(await row.innerText(), /0/)

    await row.getByRole('button', { name: 'Управление', exact: true }).click()
    drawer = page.getByRole('dialog', { name: 'Редактировать график' })
    await drawer.waitFor()

    await drawer.getByLabel('Наименование', { exact: true }).fill('E2E основной 5/2')
    const [updateResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/worktime/schedules/') && r.request().method() === 'PUT'
        && !r.url().includes('/employees/')),
      drawer.getByRole('button', { name: 'Сохранить изменения', exact: true }).click(),
    ])
    assert.equal(updateResponse.status(), 200)
    await drawer.getByText('График обновлён.', { exact: true }).waitFor()

    await drawer.getByLabel('Сотрудник', { exact: true }).selectOption('77777777-7777-4777-8777-777777777777')
    await drawer.getByLabel('Дата начала', { exact: true }).fill('2026-10-01')
    const [assignResponse] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/employees/77777777-7777-4777-8777-777777777777')
        && r.request().method() === 'PUT'),
      drawer.getByRole('button', { name: 'Назначить график', exact: true }).click(),
    ])
    assert.equal(assignResponse.status(), 200)
    await drawer.getByText('График назначен сотруднику.', { exact: true }).waitFor()
    await drawer.locator('.drawer-footer').getByRole('button', { name: 'Закрыть', exact: true }).click()

    await page.reload()
    await page.getByRole('heading', { name: 'Графики и табель' }).waitFor()
    await page.getByRole('button', { name: 'Графики работы', exact: true }).click()
    const persisted = page.getByRole('row').filter({ hasText: 'E2E основной 5/2' })
    await persisted.waitFor()
    assert.match(await persisted.innerText(), /1/)

    const api = await page.evaluate(async () => {
      const response = await fetch('/api/v1/companies/11111111-1111-4111-8111-111111111111/worktime/schedules?as_of=2026-10-16', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.json() }
    })
    assert.equal(api.status, 200)
    const saved = api.body.data.find(row => row.code === 'E2E-5X2')
    assert.equal(saved.name, 'E2E основной 5/2')
    assert.equal(saved.employees, 1)
  } finally {
    await context.close()
  }
})

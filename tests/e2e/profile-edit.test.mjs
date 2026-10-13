import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HR creates and edits a training record, then sees stale revision conflict at mobile width', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()
  const companyId = '11111111-1111-4111-8111-111111111111'
  const employeeId = '77777777-7777-4777-8777-777777777777'
  const detailUrl = `/api/v1/companies/${companyId}/employees/${employeeId}`
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Обзор системы' }).waitFor()

    await page.goto('/employees')
    await page.getByRole('row', { name: /E2E-001/ }).getByRole('link', { name: 'Открыть' }).click()
    await page.getByRole('heading', { name: 'Карточка сотрудника' }).waitFor()
    await page.getByRole('button', { name: 'Добавить сведения' }).click()
    const creator = page.getByRole('region', { name: 'Добавление кадровых сведений' })
    await creator.waitFor()
    await creator.getByRole('group', { name: 'Раздел карточки' })
      .getByRole('button', { name: 'Обучение' }).click()
    await creator.getByLabel('Вид обучения').fill('seminar')
    await creator.getByLabel('Способ обучения').selectOption('remote')
    await creator.getByLabel('Тема').fill('Плановый семинар HRM')
    await creator.getByLabel('Дата начала').fill('2026-03-01')
    await creator.getByRole('button', { name: 'Сохранить запись' }).click()

    const trainingTable = page.getByRole('table', { name: 'Обучение сотрудника' })
    const created = trainingTable.getByRole('row', { name: /Плановый семинар HRM/ })
    await created.waitFor()
    await created.getByRole('button', { name: 'Изменить' }).click()

    const editor = page.getByRole('region', { name: 'Редактирование кадровых сведений' })
    await editor.waitFor()
    assert.equal(await editor.getByLabel('Тема').inputValue(), 'Плановый семинар HRM')
    await editor.getByLabel('Тема').fill('Семинар HRM обновлён')
    await editor.getByRole('button', { name: 'Сохранить изменения' }).click()

    const modified = trainingTable.getByRole('row', { name: /Семинар HRM обновлён/ })
    await modified.waitFor()
    const result = await page.evaluate(async (url) => {
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      return { status: response.status, data: await response.json() }
    }, detailUrl)
    assert.equal(result.status, 200)
    const record = result.data.training.find(x => x.topic === 'Семинар HRM обновлён')
    assert.ok(record)
    assert.equal(record.revision, 2)

    await modified.getByRole('button', { name: 'Изменить' }).click()
    await editor.waitFor()
    await editor.getByLabel('Тема').fill('Несохранённый устаревший вариант')

    // A second editor changes the record using the same first-party session.
    const external = await page.evaluate(async ({ url, current }) => {
      const cookie = document.cookie.split('; ').find(item => item.startsWith('XSRF-TOKEN='))
      const csrf = cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : ''
      const response = await fetch(url + '/profile/training/' + current.id, {
        method: 'PUT', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf },
        body: JSON.stringify({
          revision: current.revision,
          training_type: current.training_type,
          training_mode: current.training_mode,
          topic: 'Обновление из другой вкладки',
          provider: current.provider,
          city: current.city,
          started_on: current.started_on,
          ended_on: current.ended_on,
          document_reference: current.document_reference,
        }),
      })
      return response.status
    }, { url: detailUrl, current: record })
    assert.equal(external, 200)

    await editor.getByRole('button', { name: 'Сохранить изменения' }).click()
    await editor.getByRole('alert').waitFor()
    assert.match(await editor.getByRole('alert').innerText(), /Запись уже изменена/)
    const current = await page.evaluate(async (url) => {
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      return (await response.json()).training
    }, detailUrl)
    assert.equal(current.find(x => x.id === record.id).topic, 'Обновление из другой вкладки')
    assert.equal(current.find(x => x.id === record.id).revision, 3)
    const unauthorized = await page.evaluate(async () => {
      const response = await fetch('/api/v1/companies/22222222-2222-4222-8222-222222222222/employees/77777777-7777-4777-8777-777777777777')
      return response.status
    })
    assert.equal(unauthorized, 403)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

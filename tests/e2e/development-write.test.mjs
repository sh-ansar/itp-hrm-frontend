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

test('HR creates new training and reserve entry through reused drawers', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()
  try {
    await login(page)
    await page.goto('/learning')
    await page.getByRole('heading', { name: 'Обучение', level: 1 }).waitFor()
    await page.getByRole('button', { name: 'Добавить запись' }).waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: 'Добавить запись' }).click()
    const trainingDialog = page.getByRole('dialog', { name: 'Новое обучение' })
    const editor = trainingDialog.getByRole('region', { name: 'Добавление кадровых сведений' })
    await editor.waitFor({ timeout: 15000 })
    await editor.getByLabel('Вид обучения').fill('E2E аттестация')
    await editor.getByLabel('Способ обучения').selectOption('remote')
    await editor.getByLabel('Тема').fill('E2E новая программа B07')
    await editor.getByLabel('Дата начала').fill('2026-04-10')
    await editor.getByRole('button', { name: 'Сохранить запись' }).click()
    await page.getByRole('row', { name: /E2E новая программа B07/ }).waitFor({ timeout: 15000 })

    await page.goto('/reserve')
    await page.getByRole('heading', { name: 'Кадровый резерв', level: 1 }).waitFor()
    await page.getByRole('button', { name: 'Добавить запись' }).waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: 'Добавить запись' }).click()
    const reserveDialog = page.getByRole('dialog', { name: 'Добавить в кадровый резерв' })
    const reserveEditor = reserveDialog.getByRole('region', { name: 'Добавление кадровых сведений' })
    await reserveEditor.waitFor({ timeout: 15000 })
    await reserveEditor.getByLabel('Резервируемая должность').fill('E2E начальник отдела B07')
    await reserveEditor.getByLabel('Уровень резерва').fill('senior')
    await reserveEditor.getByLabel('Вид резерва').fill('internal')
    await reserveEditor.getByLabel('Год зачисления').fill('2026')
    const reserveResponse = page.waitForResponse(response =>
      response.url().includes('/profile/reserve') && response.request().method() === 'POST')
    await reserveEditor.getByRole('button', { name: 'Сохранить запись' }).click()
    const reply = await reserveResponse
    assert.equal(reply.status(), 201, 'Reserve write rejected: ' + (await reply.text()).slice(0, 450))
    await reserveDialog.waitFor({ state: 'hidden', timeout: 10000 })
    await page.getByRole('row', { name: /E2E начальник отдела B07/ }).waitFor({ timeout: 15000 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HR saves personal and military data in Laravel from a mobile employee profile', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 900 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()

    await page.goto('/employees/11111111-1111-4111-8111-111111111111/77777777-7777-4777-8777-777777777777')
    await page.getByRole('heading', { name: 'Основные личные данные' }).waitFor()
    await page.getByRole('button', { name: 'Изменить', exact: true }).first().click()
    const personal = page.getByRole('dialog', { name: 'Личные данные и контакты' })
    await personal.waitFor()
    await personal.getByLabel('Гражданство').fill('GE')
    await personal.getByLabel('Место рождения').fill('Synthetic City')
    await personal.getByLabel('Адрес регистрации').fill('Synthetic Address')
    await personal.getByRole('button', { name: 'Сохранить изменения' }).click()
    await personal.waitFor({ state: 'hidden' })

    await page.reload()
    await page.getByRole('heading', { name: 'Основные личные данные' }).waitFor()
    await page.getByRole('button', { name: 'Изменить', exact: true }).first().click()
    await personal.waitFor()
    assert.equal(await personal.getByLabel('Место рождения').inputValue(), 'Synthetic City')
    await personal.getByRole('button', { name: 'Закрыть', exact: true }).last().click()
    await personal.waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Изменить', exact: true }).last().click()
    const military = page.getByRole('dialog', { name: 'Воинский учёт' })
    await military.getByLabel('Статус воинского учёта').fill('liable')
    await military.getByLabel('Категория воинского учёта').fill('reserve')
    await military.getByLabel('Реквизиты военного документа').fill('SYNTHETIC-REF')
    const comment = military.getByRole('textbox', { name: 'Общий комментарий' })
    assert.equal(await comment.evaluate(element => element.tagName), 'TEXTAREA',
      'Military comment should be multiline, unlike informative display fields')
    await comment.fill('Synthetic military note\nSecond line')
    const counter = await military.locator('.base-textarea-counter').innerText()
    assert.equal(counter.split('/')[1]?.trim(), '2000')
    assert.ok(Number(counter.split('/')[0]?.trim()) > 0)
    await military.getByRole('button', { name: 'Сохранить изменения' }).click()
    await military.waitFor({ state: 'hidden' })
    await page.reload()
    await page.getByRole('heading', { name: 'Воинский учёт' }).waitFor()
    assert.equal(await page.getByText('SYNTHETIC-REF', { exact: true }).count(), 1)
    await page.getByText('Synthetic military note', { exact: false }).waitFor()
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

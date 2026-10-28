import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

test('HR records searchable tags and descriptions with revisioned changes in the document register', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная' }).waitFor()
    await page.goto('/documents')
    await page.getByRole('button', { name: 'Новый черновик' }).click()
    const create = page.getByRole('dialog', { name: 'Новый черновик документа' })
    await create.getByLabel('Поиск сотрудника').fill('E2E-001')
    await create.getByRole('button', { name: 'Найти' }).click()
    await create.getByRole('combobox', { name: /^Сотрудник/ }).locator('option')
      .filter({ hasText: 'E2E-001' }).waitFor({ state: 'attached' })
    await create.getByRole('combobox', { name: /^Сотрудник/ }).selectOption({ index: 1 })
    await create.getByLabel('Вид документа').selectOption('other')
    await create.getByLabel('Название документа').fill('Сертификат ИТП 2026')
    await create.getByLabel('Раздел карточки').selectOption('development')
    await create.getByLabel('Описание документа').fill('Грамота за цифровизацию производственной системы')
    await create.getByLabel('Теги через запятую').fill('Грамота, Премия')
    await create.getByRole('button', { name: 'Создать черновик' }).click()
    const row = page.getByRole('row').filter({ hasText: 'Сертификат ИТП 2026' })
    await row.waitFor()
    assert.match(await row.innerText(), /Грамота/)

    const search = page.getByLabel('Поиск документов')
    await search.fill('граМОТА')
    await row.waitFor()
    const tag = page.getByLabel('Тег', { exact: true })
    await tag.fill('премия')
    await row.waitFor()
    await row.getByRole('button', { name: /Теги и описание:/ }).click()
    const metadata = page.getByRole('dialog', { name: 'Описание и теги документа' })
    await metadata.waitFor()
    await metadata.getByLabel('Описание документа').fill('Сертификат за внедрение автоматизации')
    await metadata.getByLabel('Теги через запятую').fill('Сертификат, Автоматизация')
    await metadata.getByRole('button', { name: 'Сохранить описание и теги' }).click()
    await metadata.waitFor({ state: 'hidden' })
    await tag.fill('')
    await search.fill('автоМАТИЗАЦИЯ')
    await row.waitFor()
    assert.match(await row.innerText(), /Автоматизация/)
    await search.fill('грамота')
    await page.getByText('Документы не найдены').waitFor()
    await search.fill('')
    await row.waitFor()
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
    await browser.close()
  }
})

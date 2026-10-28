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
    await page.getByRole('navigation', { name: 'Представление организационной структуры' }).getByRole('button', { name: 'Таблица' }).click()

    await page.getByRole('button', { name: 'Добавить подразделение' }).click()
    const createDialog = page.getByRole('dialog', { name: 'Новое подразделение' })
    await createDialog.waitFor()
    await createDialog.getByLabel('Название подразделения').fill('E2E Team')
    await createDialog.getByLabel('Родительское подразделение').selectOption({ label: 'Visible Finance' })
    await createDialog.getByRole('button', { name: 'Добавить подразделение' }).click()

    const createdRow = page.locator('.org-mobile-item').filter({ hasText: 'E2E Team' })
    await createdRow.waitFor()
    // The compact mobile card shows hierarchy depth and the manager, not a redundant parent-name label.
    assert.match(await createdRow.innerText(), /Уровень 2/)

    await createdRow.getByRole('button', { name: 'Изменить' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Изменить подразделение' })
    await editDialog.waitFor()
    assert.equal((await editDialog.getByLabel('Родительское подразделение').locator('option:checked').textContent())?.trim(),
      'Visible Finance', 'New department must retain the actual selected parent')
    await editDialog.getByLabel('Название подразделения').fill('E2E Team Renamed')
    await editDialog.getByLabel('Родительское подразделение').selectOption({ label: 'Visible Finance Child' })
    await editDialog.getByRole('button', { name: 'Сохранить изменения' }).click()

    const renamedRow = page.locator('.org-mobile-item').filter({ hasText: 'E2E Team Renamed' })
    await renamedRow.waitFor()
    assert.match(await renamedRow.innerText(), /Уровень 3/)
    await renamedRow.getByRole('button', { name: 'Изменить' }).click()
    await editDialog.waitFor()
    assert.equal((await editDialog.getByLabel('Родительское подразделение').locator('option:checked').textContent())?.trim(),
      'Visible Finance Child', 'Moving the department must persist its new parent')
    await editDialog.getByRole('button', { name: 'Отмена' }).click()

    await renamedRow.getByRole('button', { name: 'Удалить' }).click()
    const deleteDialog = page.getByRole('dialog', { name: 'Удалить подразделение' })
    await deleteDialog.waitFor()
    await deleteDialog.getByRole('button', { name: 'Удалить' }).click()

    await page.locator('.org-mobile-item').filter({ hasText: 'E2E Team Renamed' }).waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

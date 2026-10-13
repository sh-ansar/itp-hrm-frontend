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

test('HR creates staffs and approves a real staffing-plan version at mobile width', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()

  try {
    await login(page)
    await page.goto('/staffing')
    await page.getByRole('heading', { name: 'Штатное расписание', exact: true }).waitFor()
    await page.getByText('Штатное расписание ещё не создано').waitFor()

    await page.getByRole('button', { name: 'Новая версия' }).click()
    const planDialog = page.getByRole('dialog', { name: 'Новая версия штатного расписания' })
    await planDialog.waitFor()
    await planDialog.getByLabel('Название версии').fill('E2E штат 2026')
    await planDialog.getByLabel('Действует с').fill('2026-01-01')
    await planDialog.getByLabel('Действует по').fill('2026-12-31')
    await planDialog.getByRole('button', { name: 'Создать версию' }).click()

    await page.getByRole('heading', { name: 'E2E штат 2026', exact: true }).waitFor()
    await page.locator('.plan-status', { hasText: 'Черновик' }).waitFor()
    await page.getByLabel('Дата среза занятости').fill('2026-06-01')
    await page.getByRole('button', { name: 'Показать на дату' }).click()

    await page.getByRole('button', { name: 'Добавить строку' }).click()
    const lineDialog = page.getByRole('dialog', { name: 'Новая штатная единица' })
    await lineDialog.waitFor()
    await lineDialog.getByLabel('Подразделение').selectOption('33333333-3333-4333-8333-333333333333')
    await lineDialog.getByLabel('Должность').selectOption('66666666-6666-4666-8666-666666666666')
    await lineDialog.getByLabel('Количество ставок').fill('3')
    await lineDialog.getByLabel('Базовый оклад').fill('450000')
    await lineDialog.getByRole('button', { name: 'Добавить в штат' }).click()

    const table = page.getByRole('table', { name: 'Строки штатного расписания' })
    await table.waitFor()
    const row = table.getByRole('row', { name: /Visible Finance.*Test Engineer/ })
    await row.waitFor()
    const rowText = await row.innerText()
    assert.match(rowText, /3/)
    assert.match(rowText, /1/)
    assert.match(rowText, /2/)
    assert.match(rowText, /450/)
    assert.match(rowText, /KZT/)
    assert.match(rowText, /Есть вакансии/)

    const metrics = await page.locator('.metrics').innerText()
    assert.match(metrics, /Плановых ставок\s*3/)
    assert.match(metrics, /Занято\s*1/)
    assert.match(metrics, /Вакантно\s*2/)

    const views = page.getByRole('navigation', { name: 'Штатные представления' })
    await views.getByRole('button', { name: 'Вакантные позиции' }).click()
    await row.waitFor()
    await views.getByRole('button', { name: 'Сверх штата' }).click()
    await page.getByText('Сверхштатных позиций нет').waitFor()
    await views.getByRole('button', { name: 'Штатное расписание' }).click()
    await row.waitFor()

    await page.getByLabel('Поиск штатных единиц').fill('Visible Finance')
    await row.waitFor()
    await page.getByLabel('Поиск штатных единиц').fill('Несуществующее')
    await page.getByText('Штатные единицы не найдены').waitFor()
    await page.getByLabel('Поиск штатных единиц').fill('')
    await row.waitFor()

    await page.getByRole('button', { name: 'Группировка' }).click()
    await table.locator('tbody tr.table-group').first().waitFor()
    await page.locator('.column-settings summary').click()
    await page.locator('.column-options').getByLabel('Базовый оклад').uncheck()
    assert.equal(await table.getByRole('columnheader', { name: 'Базовый оклад' }).count(), 0)

    await page.getByRole('button', { name: 'Утвердить' }).first().click()
    const approveDialog = page.getByRole('dialog', { name: 'Утвердить штатное расписание' })
    await approveDialog.waitFor()
    await approveDialog.getByRole('button', { name: 'Утвердить' }).click()

    await page.locator('.plan-status', { hasText: 'Утверждено' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Добавить строку' }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Изменить' }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)

    // A newer draft must not displace the effective approved plan after reload.
    await page.getByRole('button', { name: 'Новая версия' }).click()
    const nextVersion = page.getByRole('dialog', { name: 'Новая версия штатного расписания' })
    await nextVersion.getByLabel('Название версии').fill('E2E черновик 2027')
    await nextVersion.getByLabel('Действует с').fill('2027-01-01')
    await nextVersion.getByLabel('Действует по').fill('2027-12-31')
    await nextVersion.getByRole('button', { name: 'Создать версию' }).click()
    await page.getByRole('heading', { name: 'E2E черновик 2027', exact: true }).waitFor()
    await page.reload()
    await page.getByRole('heading', { name: 'E2E штат 2026', exact: true }).waitFor({ timeout: 15000 })
    const chosen = await page.getByLabel('Версия штатного расписания').locator('option:checked').innerText()
    assert.match(chosen, /E2E штат 2026.*Утверждено/)
  } finally {
    await context.close()
  }
})

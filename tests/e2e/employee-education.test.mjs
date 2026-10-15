import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('HR creates, edits and archives real formal education independently of training', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const company = '11111111-1111-4111-8111-111111111111'
  const employee = '77777777-7777-4777-8777-777777777777'
  try {
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()

    await page.goto('/employees/' + company + '/' + employee + '?tab=development')
    const tabs = page.getByRole('navigation', { name: 'Разделы карточки сотрудника' })
    await tabs.getByRole('button', { name: 'Кадровый резерв и обучение' }).click()

    const section = page.locator('.employee-profile-section')
      .filter({ has: page.getByRole('heading', { name: 'Образование и квалификация', exact: true }) })
    await section.getByRole('button', { name: 'Изменить' }).click()
    const drawer = page.getByRole('dialog', { name: 'Образование и квалификация' })
    await drawer.waitFor()
    await drawer.getByRole('button', { name: 'Добавить образование' }).click()
    await drawer.getByLabel('Уровень / вид образования').fill('higher_education')
    await drawer.getByLabel('Учебное заведение').fill('Synthetic University')
    await drawer.getByLabel('Специальность / квалификация').fill('Engineering')
    await drawer.getByLabel('Дата начала').fill('2012-09-01')
    await drawer.getByLabel('Дата окончания').fill('2016-06-01')
    await drawer.getByRole('button', { name: 'Добавить запись' }).click()
    await drawer.waitFor({ state: 'hidden' })

    await page.getByRole('cell', { name: 'Synthetic University' }).waitFor()
    const training = page.getByRole('table', { name: 'Обучение сотрудника' })
    const beforeTraining = await training.getByRole('row').count()

    await page.reload()
    await page.getByRole('cell', { name: 'Synthetic University' }).waitFor()
    await section.getByRole('button', { name: 'Изменить' }).click()
    await drawer.waitFor()
    await drawer.getByRole('button', { name: 'Изменить' }).click()
    await drawer.getByLabel('Учебное заведение').fill('Synthetic University Updated')
    await drawer.getByRole('button', { name: 'Сохранить изменения' }).click()
    await drawer.waitFor({ state: 'hidden' })
    await page.getByRole('cell', { name: 'Synthetic University Updated' }).waitFor()

    const result = await page.evaluate(async (ids) => {
      const response = await fetch(
        '/api/v1/companies/' + ids.company + '/employees/' + ids.employee,
        { credentials: 'same-origin', headers: { Accept: 'application/json' } },
      )
      return { status: response.status, value: await response.json() }
    }, { company, employee })
    assert.equal(result.status, 200)
    assert.equal(result.value.private_profile.education.length, 1)
    assert.equal(result.value.private_profile.education[0].organization, 'Synthetic University Updated')
    assert.equal(result.value.private_profile.education[0].revision, 2)
    assert.equal(await training.getByRole('row').count(), beforeTraining)

    await section.getByRole('button', { name: 'Изменить' }).click()
    await drawer.waitFor()
    page.once('dialog', dialog => dialog.accept())
    await drawer.getByRole('button', { name: 'В архив' }).click()
    await page.getByRole('cell', { name: 'Synthetic University Updated' }).waitFor({ state: 'hidden' })
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

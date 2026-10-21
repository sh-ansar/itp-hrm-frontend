import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })
const companyId = '11111111-1111-4111-8111-111111111111'
const employeeId = '77777777-7777-4777-8777-777777777777'
const profileUrl = '/employees/' + companyId + '/' + employeeId

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
}
function section(page, name) {
  return page.locator('.employee-profile-section')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
}

test('HR persists relatives and encrypted identity documents through the real API', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()
  const failures = []
  page.on('pageerror', error => failures.push(error.message))
  try {
    await login(page)
    await page.goto(profileUrl)
    await page.getByRole('heading', { name: 'Семейные данные', exact: true }).waitFor()

    await section(page, 'Семейные данные').getByRole('button', { name: 'Изменить', exact: true }).click()
    const family = page.getByRole('dialog', { name: 'Родственники сотрудника' })
    await family.waitFor()
    await family.getByRole('button', { name: 'Добавить родственника' }).click()
    await family.getByLabel('Степень родства').fill('parent')
    await family.getByLabel('ФИО родственника').fill('Synthetic Relative')
    await family.getByLabel('Дата рождения').fill('1970-04-18')
    await family.getByRole('button', { name: 'Добавить запись' }).click()
    await family.waitFor({ state: 'hidden' })

    await page.getByRole('cell', { name: 'Synthetic Relative' }).waitFor()
    await page.reload()
    await page.getByRole('cell', { name: 'Synthetic Relative' }).waitFor()
    await section(page, 'Семейные данные').getByRole('button', { name: 'Изменить', exact: true }).click()
    await family.waitFor()
    await family.getByRole('button', { name: 'Изменить' }).click()
    await family.getByLabel('ФИО родственника').fill('Synthetic Relative Updated')
    await family.getByRole('button', { name: 'Сохранить изменения' }).click()
    await family.waitFor({ state: 'hidden' })
    await page.getByRole('cell', { name: 'Synthetic Relative Updated' }).waitFor()

    await section(page, 'Документы, удостоверяющие личность')
      .getByRole('button', { name: 'Изменить', exact: true }).click()
    const docs = page.getByRole('dialog', { name: 'Удостоверения личности' })
    await docs.waitFor()
    await docs.getByRole('button', { name: 'Добавить документ' }).click()
    await docs.getByLabel('Тип документа').fill('passport')
    await docs.getByLabel('Номер документа').fill('SYNTHETIC-DOC-0001')
    await docs.getByLabel('Персональный номер').fill('SYNTHETIC-PERSONAL-0001')
    await docs.getByLabel('Страна выдачи').fill('GE')
    await docs.getByLabel('Кем выдан').fill('Synthetic Registrar')
    await docs.getByLabel('Дата выдачи').fill('2020-01-01')
    await docs.getByLabel('Действителен до').fill('2030-01-01')
    assert.equal(await docs.getByLabel('Основной документ').isChecked(), true)
    await docs.getByRole('button', { name: 'Добавить запись' }).click()
    await docs.waitFor({ state: 'hidden' })
    const identity = section(page, 'Документы, удостоверяющие личность')
    const identityRow = identity.locator('.identity-document-record')
      .filter({ hasText: '••••0001' })
    await identityRow.waitFor()
    assert.equal(await identityRow.locator('.identity-document-primary').count(), 1)
    await identityRow.getByRole('button', { name: 'Изменить документ: passport' }).click()
    await docs.waitFor()
    assert.equal(await docs.getByLabel('Номер документа').inputValue(), 'SYNTHETIC-DOC-0001')
    await docs.getByRole('button', { name: 'К списку' }).click()
    await docs.getByRole('button', { name: 'Закрыть' }).click()
    await docs.waitFor({ state: 'hidden' })
    await page.reload()
    await identityRow.waitFor()

    const response = await page.evaluate(async ({company,employee}) => {
      const res = await fetch('/api/v1/companies/' + company + '/employees/' + employee, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: res.status, body: await res.json() }
    }, { company: companyId, employee: employeeId })
    assert.equal(response.status, 200)
    assert.equal(response.body.private_profile.family.length, 1)
    assert.equal(response.body.private_profile.family[0].full_name, 'Synthetic Relative Updated')
    assert.equal(response.body.private_profile.identity_documents.length, 1)
    assert.equal(response.body.private_profile.identity_documents[0].is_primary, true)
    assert.equal(response.body.private_profile.identity_documents[0].number, 'SYNTHETIC-DOC-0001')

    await section(page, 'Семейные данные').getByRole('button', { name: 'Изменить', exact: true }).click()
    await family.waitFor()
    page.once('dialog', dialog => dialog.accept())
    await family.getByRole('button', { name: 'В архив' }).click()
    await page.getByRole('cell', { name: 'Synthetic Relative Updated' }).waitFor({ state: 'hidden' })
    assert.deepEqual(failures, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

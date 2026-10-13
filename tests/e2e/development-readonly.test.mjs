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

test('HR sees real company training/reserve lists, protected notes and profile links in read-only mode', async () => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 375, height: 850 },
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  try {
    await login(page)
    await page.goto('/learning')
    await page.getByRole('heading', { name: 'Обучение', level: 1 }).waitFor()
    await page.locator('.development-record-card').filter({ hasText: 'E2E Completed Safety' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Добавить запись' }).count(), 0)
    assert.equal(await page.locator('.development-record-card').filter({ hasText: 'E2E Future Training' }).count(), 1)
    await page.getByRole('navigation', { name: 'Состояния обучения' })
      .getByRole('button', { name: 'Запланировано' }).click()
    await page.locator('.development-record-card').filter({ hasText: 'E2E Future Training' }).waitFor()
    assert.equal(await page.locator('.development-record-card').filter({ hasText: 'E2E Completed Safety' }).count(), 0)
    await page.getByRole('navigation', { name: 'Состояния обучения' })
      .getByRole('button', { name: 'Все программы' }).click()
    await page.locator('.development-record-card').filter({ hasText: 'E2E Completed Safety' }).waitFor()
    const employeeLink = page.locator('.development-record-card').filter({ hasText: 'E2E Completed Safety' })
      .getByRole('link', { name: 'Synthetic Employee' })
    await employeeLink.click()
    await page.waitForURL(/\/employees\/.+\/77777777-7777-4777-8777-777777777777\?tab=development/)
    await page.getByRole('table', { name: 'Обучение сотрудника' }).waitFor()

    await page.goto('/reserve')
    await page.getByRole('heading', { name: 'Кадровый резерв', level: 1 }).waitFor()
    await page.locator('.development-record-card').filter({ hasText: 'E2E Lead Specialist' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Добавить запись' }).count(), 0)
    assert.equal((await page.locator('main').innerText()).includes('PRIVATE E2E reserve assessment'), false)
    await page.getByRole('navigation', { name: 'Состояния кадрового резерва' })
      .getByRole('button', { name: 'Выбывшие' }).click()
    await page.locator('.development-record-card').filter({ hasText: 'E2E Former Candidate' }).waitFor()
    assert.equal(await page.locator('.development-record-card').filter({ hasText: 'E2E Lead Specialist' }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

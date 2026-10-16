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

test('company admin opens connected HR reports and all report tabs', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  try {
    await signIn(page)
    await page.goto('/reports')
    await page.getByRole('heading', { name: 'Отчёты', exact: true }).waitFor()
    assert.equal(await page.getByText('Доступ запрещён', { exact: true }).count(), 0)

    for (const label of ['Сводка', 'Движение персонала', 'Штат и вакансии', 'Обучение', 'Рабочее время']) {
      await page.getByRole('button', { name: label, exact: true }).click()
      await page.waitForTimeout(150)
    }

    const access = await page.evaluate(async () => {
      const response = await fetch('/api/v1/me/access', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.json() }
    })
    assert.equal(access.status, 200)
    assert.equal(access.body.data.companies[0].capabilities['reports.view'], true)

    const sources = await page.evaluate(async () => {
      const company = '11111111-1111-4111-8111-111111111111'
      const urls = [
        '/api/v1/companies/' + company + '/employees?status=active&per_page=25',
        '/api/v1/companies/' + company + '/personnel-actions?per_page=25',
        '/api/v1/companies/' + company + '/staffing-plans?per_page=25',
        '/api/v1/companies/' + company + '/development/training?per_page=25',
        '/api/v1/companies/' + company + '/worktime/timesheet?month=2026-10&per_page=100',
      ]
      return Promise.all(urls.map(async url => {
        const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        return [url, response.status]
      }))
    })
    for (const [url, status] of sources) {
      assert.equal(status, 200, url)
    }
  } finally {
    await context.close()
  }
})

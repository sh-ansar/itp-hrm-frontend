import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

const pages = [
  ['/', 'Главная'],
  ['/employees', 'Реестр сотрудников'],
  ['/employees-development', 'Кадровый резерв и обучение'],
  ['/organization', 'Организационная структура'],
  ['/staffing', 'Штатное расписание'],
  ['/staffing?view=vacant', 'Вакантные позиции'],
  ['/staffing?view=changes', 'Изменения штатного расписания'],
  ['/personnel-actions', 'Кадровые процессы'],
  ['/documents', 'Документы и приказы'],
  ['/directories', 'Справочники'],
  ['/learning', 'Обучение'],
  ['/reserve', 'Кадровый резерв'],
  ['/timesheets', 'Графики и табель'],
  ['/leaves', 'Отпуска'],
  ['/reports', 'Отчёты и аналитика'],
  ['/settings', 'Настройки'],
  ['/not-a-real-route', 'Страница не найдена'],
]

async function signIn(page) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
}

test('every HR workspace route stays visible and in-viewport on desktop, tablet and mobile', async () => {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:5173',
      viewport: { width, height: 900 },
    })
    const page = await context.newPage()
    const failures = []
    page.on('pageerror', error => failures.push(error.message))
    try {
      await signIn(page)
      for (const [route, heading] of pages) {
        const priorErrorCount = failures.length
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        const pageTitle = page.locator('main#main-content h1').first()
        await pageTitle.waitFor()
        assert.ok((await pageTitle.innerText()).includes(heading),
          `Wrong heading on ${route} at ${width}px: expected ${heading}`)
        // Give the first authorized API read a chance to populate cards/tables.
        await page.waitForTimeout(160)
        const geometry = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }))
        assert.ok(geometry.document <= width + 1 && geometry.body <= width + 1,
          `Document overflows on ${route} at ${width}px: ${JSON.stringify(geometry)}`)
        assert.equal(failures.length, priorErrorCount,
          `Uncaught browser error on ${route} at ${width}px: ${failures.slice(priorErrorCount).join('; ')}`)
      }
    } finally {
      await context.close()
    }
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
const employeeUrl = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

const locales = {
  en: {
    views: [
      ['/employees', 'Employee register'],
      ['/organization', 'Organizational structure'],
      ['/staffing', 'Staffing plan'],
      ['/documents', 'Documents and orders'],
    ],
    personal: 'Personal data',
    birth: 'Date of birth',
  },
  kk: {
    views: [
      ['/employees', 'Қызметкерлер тізілімі'],
      ['/organization', 'Ұйымдық құрылым'],
      ['/staffing', 'Штаттық кесте'],
      ['/documents', 'Құжаттар мен бұйрықтар'],
    ],
    personal: 'Жеке деректер',
    birth: 'Туған күні',
  },
}

for (const [locale, expected] of Object.entries(locales)) {
  test(`locale ${locale} updates core workspace headings, navigation and dates`, async () => {
    const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/settings')
      await page.evaluate(selected => {
        localStorage.setItem('hrm-locale', selected)
        localStorage.setItem('hrm-date-format', 'yyyy-mm-dd')
        localStorage.setItem('hrm-number-format', 'comma')
        localStorage.setItem('hrm-time-zone', 'Asia/Almaty')
      }, locale)
      for (const [route, heading] of expected.views) {
        await page.goto(route)
        const title = page.locator('main#main-content h1').first()
        await title.waitFor()
        assert.ok((await title.innerText()).includes(heading), `Expected ${heading} on ${route}`)
      }
      await page.goto(employeeUrl)
      await page.getByRole('button', { name: expected.personal, exact: true }).click()
      const birth = page.locator('.employee-data-field').filter({ hasText: expected.birth }).first()
      await birth.waitFor()
      assert.match((await birth.locator('strong').innerText()).trim(), /^\\d{4}-\\d{2}-\\d{2}$/)
      assert.deepEqual(errors, [], 'No browser runtime errors')
    } finally {
      await context.close()
    }
  })
}

test('English working views remain responsive on narrow mobile and tablet widths', async () => {
  for (const width of [375, 768]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    try {
      await page.goto('/settings')
      await page.evaluate(() => localStorage.setItem('hrm-locale', 'en'))
      for (const route of ['/employees', '/organization', '/staffing', '/documents']) {
        await page.goto(route)
        await page.locator('main#main-content h1').first().waitFor()
        const overflow = await page.evaluate(() =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)
        assert.ok(overflow <= 1, `Viewport overflow ${overflow}px on ${route} at ${width}px`)
      }
    } finally {
      await context.close()
    }
  }
})

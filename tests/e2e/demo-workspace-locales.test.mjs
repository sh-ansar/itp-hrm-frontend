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
  ka: {
    views: [
      ['/employees', 'თანამშრომლების რეესტრი'],
      ['/organization', 'ორგანიზაციული სტრუქტურა'],
      ['/staffing', 'საშტატო განრიგი'],
      ['/documents', 'დოკუმენტები და ბრძანებები'],
    ],
    personal: 'პირადი მონაცემები',
    birth: 'დაბადების თარიღი',
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
      assert.match((await birth.locator('strong').innerText()).trim(), /^\d{4}-\d{2}-\d{2}$/)
      assert.deepEqual(errors, [], 'No browser runtime errors')
    } finally {
      await context.close()
    }
  })
}

test('translated working views remain responsive on mobile and tablet widths', async () => {
  for (const width of [375, 768]) {
    for (const locale of ['en', 'kk', 'ka']) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    try {
      await page.goto('/settings')
      await page.evaluate(selected => localStorage.setItem('hrm-locale', selected), locale)
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
  }
})


test('Georgian is selectable at runtime, persists and stays legible in dark theme', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/employees')
    await page.locator('.locale-control select').selectOption('ka')
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'ka')
    assert.equal(await page.locator('.locale-control select').inputValue(), 'ka')
    assert.match(await page.locator('main#main-content h1').first().innerText(), /თანამშრომლების რეესტრი/)
    const themeButton = page.getByRole('button', { name: 'მუქი თემის ჩართვა' })
    await themeButton.click()
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark')
    const darkColors = await page.evaluate(() => {
      const style = getComputedStyle(document.body)
      return { background: style.backgroundColor, color: style.color }
    })
    assert.equal(darkColors.background, 'rgb(9, 38, 52)', 'dark theme body must have a dark background')
    assert.equal(darkColors.color, 'rgb(229, 246, 255)', 'dark theme must use visible text')
    await page.reload()
    await page.locator('main#main-content h1').first().waitFor()
    assert.equal(await page.locator('.locale-control select').inputValue(), 'ka')
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark')
    await page.goto('/settings')
    const language = page.getByText('ენა', { exact: true })
    assert.ok((await language.count()) > 0, 'Settings labels must be Georgian')
    assert.deepEqual(errors, [], 'No browser runtime exceptions while switching languages and themes')
  } finally {
    await context.close()
  }
})

test('Georgian dark theme has no pale page overlay or horizontal viewport overflow', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.addInitScript(() => {
        localStorage.setItem('hrm-theme', 'dark')
        localStorage.setItem('hrm-locale', 'ka')
      })
      for (const path of ['/employees', '/organization', '/staffing', '/documents', employeeUrl]) {
        await page.goto(path)
        await page.locator('main#main-content h1').first().waitFor()
        const visual = await page.evaluate(() => {
          const appMain = document.querySelector('main#main-content')
          const body = getComputedStyle(document.body)
          const content = appMain ? getComputedStyle(appMain) : null
          return {
            theme: document.documentElement.dataset.theme,
            lang: document.documentElement.lang,
            foreground: body.color,
            background: body.backgroundColor,
            contentBackground: content?.backgroundColor,
            overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
            overlay: Boolean(document.querySelector('.drawer-overlay, .nav-backdrop')),
          }
        })
        assert.equal(visual.theme, 'dark', 'Dark theme lost on ' + path)
        assert.equal(visual.lang, 'ka', 'Georgian locale lost on ' + path)
        assert.equal(visual.background, 'rgb(9, 38, 52)', 'Wrong page background on ' + path)
        assert.equal(visual.contentBackground, 'rgb(9, 38, 52)', 'Wrong content surface on ' + path)
        assert.equal(visual.foreground, 'rgb(229, 246, 255)', 'Wrong foreground on ' + path)
        assert.ok(visual.overflow <= 1, 'Horizontal overflow on ' + path + ' at ' + width + ': ' + visual.overflow)
        assert.equal(visual.overlay, false, 'Unexpected overlay on ' + path)
      }
      assert.deepEqual(errors, [], 'Georgian dark mode must not trigger runtime errors')
    } finally {
      await context.close()
    }
  }
})

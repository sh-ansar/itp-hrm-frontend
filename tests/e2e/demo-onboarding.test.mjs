import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('onboarding completes the three-step flow without persisting employee fields', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto('/onboarding')
    await page.getByRole('heading', { name: 'Добро пожаловать в систему', level: 1 }).waitFor()

    const next = page.getByRole('button', { name: 'Продолжить' })
    assert.equal(await next.isEnabled(), true)
    await next.click()

    await page.getByRole('heading', { name: 'Настройка рабочего места', level: 2 }).waitFor()
    assert.equal(await next.isEnabled(), true)
    await next.click()

    await page.getByRole('heading', { name: 'Подтверждение ответственности', level: 2 }).waitFor()
    const finish = page.getByRole('button', { name: 'Приступить к работе' })
    assert.equal(await finish.isDisabled(), true)

    await page.getByRole('checkbox', { name: /Конфиденциальность/ }).check()
    await page.getByRole('checkbox', { name: /Информационная безопасность/ }).check()
    await page.getByRole('checkbox', { name: /Внутренние политики и регламенты/ }).check()
    assert.equal(await finish.isEnabled(), true)

    await finish.click()
    await page.waitForURL(url => url.pathname === '/')
    await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
    assert.equal(await page.locator('.onboarding-entry').count(), 0)

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('hrm-onboarding-complete-v1')
      return raw ? JSON.parse(raw) : null
    })
    assert.ok(stored?.completedAt)
    assert.deepEqual(Object.keys(stored).sort(), ['completedAt'])
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})

test('onboarding fits phone and tablet viewports', async () => {
  for (const width of [375, 768]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 850 } })
    const page = await context.newPage()
    try {
      await page.goto('/onboarding')
      await page.getByRole('heading', { name: 'Добро пожаловать в систему', level: 1 }).waitFor()
      const size = await page.evaluate(() => ({
        viewport: innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      assert.ok(size.html <= width + 1 && size.body <= width + 1, 'Onboarding overflow: '+JSON.stringify(size))
    } finally {
      await context.close()
    }
  }
})

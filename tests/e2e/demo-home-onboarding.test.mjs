import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = 'http://127.0.0.1:5173'
let browser

before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('three-step onboarding matches the demo flow and stays responsive', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/?onboarding=1')
      await page.getByRole('heading', { name: 'Добро пожаловать в систему' }).waitFor()

      const assertNoOverflow = async label => {
        const layout = await page.evaluate(() => ({
          viewport: innerWidth,
          html: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }))
        assert.ok(layout.html <= width + 1 && layout.body <= width + 1,
          label + ' overflow at ' + width + ': ' + JSON.stringify(layout))
      }

      assert.equal(await page.getByText('Личная информация пользователя', { exact: true }).count() > 0, true)
      await assertNoOverflow('personal step')

      await page.getByRole('button', { name: 'Продолжить' }).click()
      await page.getByRole('heading', { name: 'Настройка рабочего места' }).waitFor()
      assert.equal(await page.getByLabel('Личный кабинет HRM').isChecked(), true)
      await assertNoOverflow('workplace step')

      await page.getByRole('button', { name: 'Продолжить' }).click()
      await page.getByRole('heading', { name: 'Подтверждение ответственности' }).waitFor()
      const finish = page.getByRole('button', { name: 'Приступить к работе' })
      assert.equal(await finish.isDisabled(), true)

      await page.getByLabel('Я ознакомлен(а) с требованиями конфиденциальности').check()
      await page.getByLabel('Я ознакомлен(а) с правилами обработки персональных данных').check()
      await page.getByLabel('Я принимаю ответственность за действия под своей учётной записью').check()
      assert.equal(await finish.isEnabled(), true)
      await finish.click()

      await page.waitForURL(url => url.pathname === '/' && !url.searchParams.has('onboarding'))
      await page.getByRole('heading', { name: 'Главная', level: 1 }).waitFor()
      assert.equal(await page.getByRole('heading', { name: 'Добро пожаловать в систему' }).count(), 0)
      await assertNoOverflow('dashboard after onboarding')
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

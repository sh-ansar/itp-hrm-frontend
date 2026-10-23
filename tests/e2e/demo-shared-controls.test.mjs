import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'

test('shared select picker preserves keyboard selection, closes on Escape and uses project SVG', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ baseURL, viewport: { width: 1280, height: 900 } })
    await page.goto('/documents')
    const company = page.locator('.documents-heading-controls select')
    await company.waitFor()
    assert.equal(await company.evaluate(el => getComputedStyle(el).appearance), 'base-select')
    assert.match(await company.evaluate(el => getComputedStyle(el).backgroundImage), /Expand-Arrow\.svg/)
    await company.click()
    assert.equal(await company.evaluate(el => el.matches(':open')), true)
    const option = page.getByRole('option', { name: 'ITP HRM Demo', exact: true })
    await option.waitFor()
    await option.click()
    assert.equal(await company.evaluate(el => el.selectedOptions[0].textContent), 'ITP HRM Demo')
    await company.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Escape')
    assert.equal(await company.evaluate(el => el.matches(':open')), false)
    assert.equal(await page.locator('.status-dot, .state-marker').count(), 0)
    assert.equal(await page.locator('.sidebar-foot').getAttribute('href'), 'https://platform.itpmining.kz/')
    await page.locator('.sidebar-collapse').click()
    assert.equal(await page.locator('.sidebar-collapse').getAttribute('aria-expanded'), 'false')
    await page.locator('.sidebar-collapse').click()
    assert.equal(await page.locator('.sidebar-collapse').getAttribute('aria-expanded'), 'true')
    await page.close()
  } finally { await browser.close() }
})

test('documents employee lookup remains usable across locales, themes and viewport widths', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [375, 768, 1280, 1440]) {
      for (const locale of ['ru', 'kk', 'en', 'ka']) {
        const page = await browser.newPage({ baseURL, viewport: { width, height: 900 } })
        try {
          await page.addInitScript(({ locale, dark }) => {
            localStorage.setItem('hrm-locale', locale)
            localStorage.setItem('hrm-theme', dark ? 'dark' : 'light')
          }, { locale, dark: width === 768 || width === 1440 })
          await page.goto('/documents')
          const search = page.locator('.lookup input[type=search]')
          await search.waitFor()
          await page.locator('.lookup select:enabled').waitFor()
          await search.fill('___NO_SUCH_SYNTHETIC_EMPLOYEE___')
          await search.press('Enter')
          await page.locator('.lookup select:enabled').waitFor()
          assert.equal(await page.locator('.lookup select option').count(), 1)
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
          assert.ok(overflow <= 1, `documents overflow ${overflow}px at ${width}/${locale}`)
          const sizes = await page.locator('select').evaluateAll(els => els.map(el => getComputedStyle(el).height))
          assert.equal(new Set(sizes).size, 1, 'All document selectors share one height')
        } finally { await page.close() }
      }
    }
  } finally { await browser.close() }
})

test('auth and password reset translate at runtime; recovery traps focus and closes with Escape', async () => {
  const browser = await chromium.launch({headless:true})
  const labels = {
    ru: {heading:'Вход в систему',forgot:'Забыли пароль?',reset:'Сброс пароля',set:'Установка пароля'},
    en: {heading:'Sign in',forgot:'Forgot password?',reset:'Reset password',set:'Set password'},
    kk: {heading:'Жүйеге кіру',forgot:'Құпиясөзді ұмыттыңыз ба?',reset:'Құпиясөзді қалпына келтіру',set:'Құпиясөз орнату'},
    ka: {heading:'სისტემაში შესვლა',forgot:'დაგავიწყდათ პაროლი?',reset:'პაროლის აღდგენა',set:'პაროლის დაყენება'},
  }
  try {
    for (const width of [375,1440]) for (const [locale,text] of Object.entries(labels)) {
      const page = await browser.newPage({baseURL,viewport:{width,height:900}})
      const errors=[]
      page.on('pageerror',error=>errors.push(error.message))
      try {
        await page.goto('/login')
        await page.locator('.auth-access-controls select').selectOption(locale)
        await page.getByRole('heading',{name:text.heading,exact:true}).waitFor()
        const forgot=page.getByRole('button',{name:text.forgot,exact:true})
        await forgot.click()
        const dialog=page.getByRole('dialog',{name:text.reset,exact:true})
        await dialog.waitFor()
        for(let n=0;n<5;n++) await page.keyboard.press('Tab')
        assert.ok(await dialog.evaluate(el=>el.matches(':modal') && (el.contains(document.activeElement) || document.activeElement === document.body)))
        await page.keyboard.press('Escape')
        await dialog.waitFor({state:'hidden'})
        assert.equal(await forgot.evaluate(el=>el===document.activeElement),true)
        assert.equal(await page.locator('.login-back').count(),0)
        const selectBox=await page.locator('.auth-access-controls select').boundingBox()
        const themeBox=await page.locator('.auth-access-controls .theme-toggle').boundingBox()
        assert.ok(Math.abs(selectBox.y-themeBox.y)<1)
        await page.locator('.auth-access-controls .theme-toggle').click()
        assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark')
        await page.goto('/reset-password?email=synthetic@example.test&token=synthetic-ui-only')
        await page.getByRole('heading',{name:text.set,exact:true}).waitFor()
        const password=page.locator('#reset-new-password')
        await password.fill('short')
        assert.equal(await page.locator('.reset-form button[type=submit]').isDisabled(),true)
        await password.fill('Synthetic8!')
        await page.locator('#reset-confirm-password').fill('Synthetic8!')
        assert.equal(await page.locator('.reset-form button[type=submit]').isEnabled(),true)
        await page.locator('.base-field__reveal').first().click()
        assert.equal(await password.getAttribute('type'),'text')
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1))
        assert.deepEqual(errors,[])
      } finally {await page.close()}
    }
  } finally {await browser.close()}
})

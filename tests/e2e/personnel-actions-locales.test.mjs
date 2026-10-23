import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const languages = [
  { locale:'ru', newAction:'Новое действие', newTitle:'Новое кадровое действие', search:'Поиск сотрудника', find:'Найти', action:'Кадровое действие',
    effective:'Дата действия', basis:'Основание', department:'Подразделение', position:'Должность',
    next:'Продолжить: Перевод', title:'Подтверждение кадрового действия',
    back:'Вернуться', execute:'Подтвердить и провести' },
  { locale:'kk', newAction:'Жаңа әрекет', newTitle:'Жаңа кадрлық әрекет', search:'Қызметкерді іздеу', find:'Іздеу', action:'Кадрлық әрекет',
    effective:'Күшіне ену күні', basis:'Негіздеме', department:'Бөлімше', position:'Лауазым',
    next:'Жалғастыру: Ауыстыру', title:'Кадрлық әрекетті растау',
    back:'Оралу', execute:'Растау және орындау' },
  { locale:'en', newAction:'New action', newTitle:'New personnel action', search:'Find employee', find:'Search', action:'Personnel action',
    effective:'Effective date', basis:'Supporting reference', department:'Department',
    position:'Position', next:'Continue: Transfer', title:'Confirm personnel action',
    back:'Go back', execute:'Confirm and execute' },
  { locale:'ka', newAction:'ახალი მოქმედება', newTitle:'ახალი საკადრო მოქმედება', search:'თანამშრომლის ძებნა', find:'ძებნა', action:'საკადრო მოქმედება',
    effective:'ამოქმედების თარიღი', basis:'საფუძველი', department:'განყოფილება',
    position:'თანამდებობა', next:'გაგრძელება: გადაყვანა',
    title:'საკადრო მოქმედების დადასტურება', back:'დაბრუნება',
    execute:'დადასტურება და შესრულება' },
]

test('personnel action preview is localized for RU KK EN KA and never executes on cancellation', async () => {
  const browser = await chromium.launch({
    headless:true, ...(process.env.HRM_CHROME_PATH ? { executablePath:process.env.HRM_CHROME_PATH } : {}),
  })
  const context = await browser.newContext({
    baseURL:process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173',
    viewport:{ width:375, height:850 },
  })
  try {
    const page = await context.newPage()
    await page.goto('/login')
    await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
    await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
    await page.getByRole('button', { name:'Войти', exact:true }).click()
    await page.waitForURL(url => !url.pathname.endsWith('/login'))
    const totalActions = async () => page.evaluate(async () => {
      const response = await fetch('/api/v1/companies/11111111-1111-4111-8111-111111111111/personnel-actions',
        { credentials:'same-origin', headers:{ Accept:'application/json' } })
      if (!response.ok) throw new Error('Cannot verify staffing unchanged: HTTP ' + response.status)
      const body = await response.json()
      return body.meta.total
    })
    const baseline = await totalActions()
    for (const lang of languages) {
      await page.evaluate(locale => localStorage.setItem('hrm-locale', locale), lang.locale)
      await page.goto('/personnel-actions')
      await page.getByRole('button',{name:lang.newAction,exact:true}).click()
      const form = page.getByRole('dialog',{name:lang.newTitle})
      await form.getByLabel(lang.search).fill('E2E-001')
      await form.getByRole('button',{name:lang.find,exact:true}).click()
      await form.locator('.employee-summary').waitFor()
      await form.getByRole('combobox',{name:lang.action}).selectOption('transfer')
      await form.getByLabel(lang.effective).fill('2026-10-01')
      await form.getByLabel(lang.basis).fill('I18N-PREVIEW-NO-WRITE')
      await form.getByRole('combobox',{name:lang.department}).selectOption({label:'Visible Finance Child'})
      await form.getByRole('combobox',{name:lang.position}).selectOption({label:'Test Engineer'})
      await form.getByRole('button',{name:lang.next,exact:true}).click()
      const confirmation = page.getByRole('dialog',{name:lang.title,exact:true})
      await confirmation.getByRole('button',{name:lang.execute,exact:true}).waitFor()
      await confirmation.getByRole('button',{name:lang.back,exact:true}).click()
      await confirmation.waitFor({state:'hidden'})
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false, 'No horizontal viewport overflow in ' + lang.locale)
      assert.equal(await page.locator('.action-mobile-card').filter({hasText:'I18N-PREVIEW-NO-WRITE'}).count(),
        0, 'Cancelled preview must not show any action for ' + lang.locale)
      assert.equal(await totalActions(), baseline,
        'Cancelling localized preview must not write personnel actions for ' + lang.locale)
    }
  } finally {
    await context.close()
    await browser.close()
  }
})

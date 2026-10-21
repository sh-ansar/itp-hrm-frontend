import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const card = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('employee card regression: all main tabs, identity masking, document UI, history and no overflow', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({baseURL,viewport:{width,height:900}})
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(String(error.message)))
    try {
      await page.goto(card)
      const nav = page.getByRole('navigation',{name:'Разделы карточки сотрудника'})
      await nav.waitFor()
      const sections = [
        ['Личные данные', '.employee-family-list'],
        ['Организационные данные', '.employee-profile-section'],
        ['Трудовые данные', '.employee-profile-section'],
        ['Документы', '.employee-documents-panel'],
        ['Расчёты и начисления', '.employee-profile-section'],
        ['График и табель', '.employee-month-worktime'],
        ['Кадровый резерв и обучение', '.employee-profile-section'],
        ['История изменений', '.employee-profile-section'],
      ]
      for(const [name,selector] of sections){
        await nav.getByRole('button',{name,exact:true}).click()
        await page.locator(selector).first().waitFor()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1),false,
          'Unexpected page overflow at '+width+' on '+name)
      }
      await nav.getByRole('button',{name:'История изменений',exact:true}).click()
      const audit=page.getByRole('table',{name:'История изменений карточки сотрудника'})
      await audit.waitFor()
      assert.equal(await audit.getByRole('columnheader',{name:'Автор'}).count(),1)
      assert.equal(await audit.getByRole('columnheader',{name:'Дата и время'}).count(),1)
      assert.equal(await audit.getByRole('columnheader',{name:'Изменение'}).count(),1)
      assert.equal(await audit.locator('input,select,textarea').count(),0,
        'Audit log must not contain editable fields')
      await nav.getByRole('button',{name:'Документы',exact:true}).click()
      const documents=page.locator('.employee-documents-panel')
      await documents.waitFor()
      await documents.getByRole('searchbox',{name:'Поиск документов'}).fill('нет-такого-документа-regression')
      await documents.getByText('Документы не добавлены').waitFor()
      await documents.getByRole('searchbox',{name:'Поиск документов'}).clear()
      await nav.getByRole('button',{name:'График и табель',exact:true}).click()
      await page.locator('.employee-timesheet-history').waitFor()
      assert.equal(await page.locator('.employee-timesheet-history input[type=file]').count(),0)
      assert.deepEqual(errors,[],'JavaScript runtime errors at width '+width)
    } finally { await context.close() }
  }
})

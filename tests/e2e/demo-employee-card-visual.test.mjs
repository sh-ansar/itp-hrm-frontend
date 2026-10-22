import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

const tabs = ['Личные данные','Организационные данные','Трудовые данные','Документы',
  'Расчёты и начисления','График и табель','Кадровый резерв и обучение','История изменений']
const url = '/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'

test('employee card uses compact reference typography in each tab and dark mode', async () => {
  for (const width of [375,768,1280,1440]) {
    const context = await browser.newContext({ baseURL:'http://127.0.0.1:5173', viewport:{width,height:900} })
    const page = await context.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    try {
      await page.goto(url)
      await page.getByRole('navigation',{name:'Разделы карточки сотрудника'}).waitFor()
      const result=await page.evaluate(()=>{
        const get=selector=>{
          const node=document.querySelector(selector)
          if(!node)throw new Error('Missing visual selector '+selector)
          const style=getComputedStyle(node)
          return {font:parseFloat(style.fontSize),line:parseFloat(style.lineHeight),height:node.getBoundingClientRect().height}
        }
        return {
          label:get('.employee-data-field > span'),
          value:get('.employee-data-field > strong'),
          header:get('.employee-profile-section .section-heading h2'),
          tab:get('.employee-profile .view-tab'),
          name:get('.read-field strong'),
        }
      })
      assert.ok(result.label.font<=13, `Field labels too large at ${width}: ${result.label.font}`)
      assert.ok(result.value.font<=14, `Field values too large at ${width}: ${result.value.font}`)
      assert.ok(result.header.font<=18, `Section titles too large at ${width}: ${result.header.font}`)
      assert.ok(result.tab.font<=13, `Card tabs too large at ${width}: ${result.tab.font}`)
      assert.ok(result.name.font<=14)
      assert.ok(result.value.height<=49)
      const navigation=page.getByRole('navigation',{name:'Разделы карточки сотрудника'})
      for(const tab of tabs){
        await navigation.getByRole('button',{name:tab,exact:true}).click()
        await page.waitForTimeout(50)
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,
          `Horizontal page overflow in tab ${tab} at ${width}`)
      }
      assert.deepEqual(errors,[])
      if(width===1280){
        await navigation.getByRole('button',{name:'Личные данные',exact:true}).click()
        await page.locator('.employee-data-field > strong').first().waitFor()
        await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'))
        const dark=await page.evaluate(()=>getComputedStyle(document.querySelector('.employee-data-field > strong')).backgroundColor)
        assert.notEqual(dark,'rgb(255, 255, 255)','Dark mode must use theme tokens')
      }
    } finally { await context.close() }
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL=process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})

test('directories use the five-tab prototype split workspace responsively',async()=>{
  for(const width of [375,768,1440]){
    const context=await browser.newContext({baseURL,viewport:{width,height:900}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    try{
      await page.goto('/directories')
      await page.getByRole('heading',{name:'Справочники',level:1}).waitFor()

      const expected=[
        'Отпуска и лимиты',
        'Условия труда, надбавки и компенсации',
        'Тарифы и начисления',
        'Развитие и подбор кадров',
        'Документы и основания',
      ]
      for(const label of expected)
        assert.equal(await page.locator('.view-tabs').getByRole('button',{name:label,exact:true}).count(),1,'missing directory tab '+label)

      assert.equal(await page.locator('.view-tabs').getByRole('button',{name:'Должности'}).count(),0)
      assert.equal(await page.getByRole('link',{name:'Справочник должностей'}).count(),1)

      const tariffTrigger=page.getByRole('button',{name:/Виды тарифов/})
      await tariffTrigger.waitFor()
      assert.equal(await tariffTrigger.getAttribute('aria-expanded'),'true')
      await page.getByRole('table',{name:'Виды тарифов'}).waitFor()
      assert.equal(await page.getByRole('table',{name:'Виды тарифов'}).count(),1)
      assert.equal(await page.locator('.directory-detail').count(),1)
      assert.equal(await page.locator('.directory-index').count(),1)

      await page.locator('.view-tabs').getByRole('button',{name:'Отпуска и лимиты',exact:true}).click()
      const leaveTrigger=page.getByRole('button',{name:/Виды отпусков/})
      await leaveTrigger.waitFor()
      assert.equal(await leaveTrigger.getAttribute('aria-expanded'),'true')
      await page.getByRole('table',{name:'Виды отпусков'}).waitFor()
      assert.equal(await page.getByRole('table',{name:'Виды отпусков'}).count(),1)

      const scroll=page.locator('.directory-table-scroll').first()
      const styles=await scroll.evaluate(el=>({
        overflowX:getComputedStyle(el).overflowX,
        overflowY:getComputedStyle(el).overflowY,
      }))
      assert.equal(styles.overflowX,'auto')
      assert.equal(styles.overflowY,'hidden')

      const layout=await page.evaluate(()=>({
        viewport:innerWidth,
        html:document.documentElement.scrollWidth,
        body:document.body.scrollWidth,
      }))
      assert.ok(layout.html<=width+1&&layout.body<=width+1,
        'directories overflow at '+width+': '+JSON.stringify(layout))
      assert.deepEqual(errors,[])
    }finally{await context.close()}
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL='http://127.0.0.1:5173'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})

test('roles permission matrix exposes scoped rights like the source prototype',async()=>{
  for(const width of [375,768,1440]){
    const context=await browser.newContext({baseURL,viewport:{width,height:900}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    try{
      await page.goto('/roles')
      await page.getByRole('tab',{name:'Создание роли и её права'}).click()
      await page.getByRole('heading',{name:'Создание роли и её права',level:1}).waitFor()

      const adminToggle=page.getByRole('button',{name:/Администратор компании/})
      await adminToggle.waitFor()
      assert.equal(await adminToggle.getAttribute('aria-expanded'),'true')

      const table=page.getByRole('table',{name:'Матрица прав роли Администратор компании'})
      await table.waitFor()
      assert.equal(await table.getByRole('columnheader',{name:'Просмотр · Право'}).count(),1)
      assert.equal(await table.getByRole('columnheader',{name:'Просмотр · Область'}).count(),1)
      assert.ok(await table.getByLabel('Область просмотра').count()>=1)

      const firstScope=table.getByLabel('Область просмотра').first()
      assert.equal(await firstScope.inputValue(),'all')
      await firstScope.selectOption('company')
      assert.equal(await firstScope.inputValue(),'company')

      const hrToggle=page.getByRole('button',{name:/HR-специалист/})
      await hrToggle.click()
      assert.equal(await page.getByRole('table',{name:'Матрица прав роли HR-специалист'}).count(),1)

      const fullscreen=page.getByRole('button',{name:'На весь экран'})
      await fullscreen.click()
      assert.equal(await page.locator('.roles-permissions-workspace.is-fullscreen').count(),1)
      await page.getByRole('button',{name:'Выйти из полноэкранного режима'}).click()

      const scroll=page.locator('.permission-matrix-scroll').first()
      const styles=await scroll.evaluate(el=>({
        overflowX:getComputedStyle(el).overflowX,
        overflowY:getComputedStyle(el).overflowY,
      }))
      assert.equal(styles.overflowX,'auto')
      assert.equal(styles.overflowY,'hidden')

      const layout=await page.evaluate(()=>({
        viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,
      }))
      assert.ok(layout.html<=width+1&&layout.body<=width+1,
        'roles matrix overflow at '+width+': '+JSON.stringify(layout))
      assert.deepEqual(errors,[])
    }finally{await context.close()}
  }
})

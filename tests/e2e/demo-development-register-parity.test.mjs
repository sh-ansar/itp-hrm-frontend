import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL='http://127.0.0.1:5173'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})

test('development workspace matches the employee-centric prototype register responsively',async()=>{
  for(const width of [375,768,1440]){
    const context=await browser.newContext({baseURL,viewport:{width,height:900}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    try{
      await page.goto('/employees-development')
      await page.getByRole('heading',{name:/Кадровый резерв и обучение сотрудников/,level:1}).waitFor()

      assert.equal(await page.getByRole('table',{name:'Кадровый резерв и обучение сотрудников'}).count(),1)
      assert.equal(await page.getByRole('searchbox',{name:'Поиск сотрудников развития'}).count(),1)
      assert.equal(await page.getByRole('button',{name:'Фильтры'}).count(),1)
      assert.equal(await page.getByRole('button',{name:'Группировка'}).count(),1)
      assert.equal(await page.getByRole('button',{name:'Настройка колонок'}).count(),1)
      assert.equal(await page.getByRole('button',{name:'Шаблоны'}).count(),1)
      assert.equal(await page.getByRole('button',{name:'Экспорт'}).count(),1)
      assert.equal(await page.getByRole('button',{name:'Действия',exact:true}).count(),1)

      await page.getByRole('button',{name:'Группировка'}).click()
      await page.getByRole('menu',{name:'Группировка'}).getByRole('menuitem',{name:'По отделам'}).click()

      await page.getByRole('button',{name:'Фильтры'}).click()
      const drawer=page.getByRole('dialog',{name:'Фильтры'})
      await drawer.waitFor()
      assert.equal(await drawer.getByLabel('Статус развития').count(),1)
      await drawer.getByRole('button',{name:'Применить'}).click()

      const fs=page.getByRole('button',{name:'На весь экран'})
      await fs.click()
      assert.equal(await page.locator('.employee-development-page.is-fullscreen').count(),1)
      await page.getByRole('button',{name:'Выйти из полноэкранного режима'}).click()

      const layout=await page.evaluate(()=>({
        viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,
      }))
      assert.ok(layout.html<=width+1&&layout.body<=width+1,
        'development register overflow at '+width+': '+JSON.stringify(layout))
      assert.deepEqual(errors,[])
    }finally{await context.close()}
  }
})

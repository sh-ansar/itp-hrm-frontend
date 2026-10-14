import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL='http://127.0.0.1:5173'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})

test('organization exposes employee creation in a responsive right-side drawer', async()=>{
  for(const width of [375,768,1440]){
    const context=await browser.newContext({baseURL,viewport:{width,height:900}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    try{
      await page.goto('/organization')
      await page.getByRole('heading',{name:/Организационная структура/,level:1}).waitFor()
      const add=page.getByRole('button',{name:/Добавить сотрудника/})
      if(await add.count()){
        await add.click()
        const drawer=page.getByRole('dialog',{name:'Добавить сотрудника'})
        await drawer.waitFor()
        assert.equal(await drawer.getByText('Фото сотрудника',{exact:true}).count(),1)
        assert.equal(await drawer.getByLabel('Табельный номер').count(),1)
        await drawer.getByRole('button',{name:'Закрыть'}).click()
      }
      const layout=await page.evaluate(()=>({
        viewport:innerWidth,
        html:document.documentElement.scrollWidth,
        body:document.body.scrollWidth,
      }))
      assert.ok(layout.html<=width+1&&layout.body<=width+1,
        'organization overflow at '+width+': '+JSON.stringify(layout))
      assert.deepEqual(errors,[])
    }finally{await context.close()}
  }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL='http://127.0.0.1:5173'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})

test('topbar account popover matches the prototype shell on desktop and mobile',async()=>{
  for(const width of [375,768,1440]){
    const context=await browser.newContext({baseURL,viewport:{width,height:900}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    try{
      await page.goto('/')
      const trigger=page.locator('.profile-trigger')
      await trigger.waitFor()
      await trigger.click()

      const menu=page.locator('.profile-popover')
      await menu.waitFor()
      assert.equal(await menu.getByText('Online',{exact:true}).count(),1)
      assert.equal(await menu.getByText('Отключить уведомления',{exact:true}).count(),1)
      assert.ok(await menu.getByRole('link',{name:/Профиль и настройки/}).count()===1)
      assert.ok(await menu.getByRole('link',{name:/Настройки|Settings|Баптаулар/}).count()===1)

      const toggle=menu.getByRole('checkbox')
      await toggle.check()
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('hrm-settings-profile-v2')||'{}'))
      assert.equal(saved.notificationChannels.email,false)
      assert.equal(saved.notificationChannels.in_app,false)

      await menu.getByRole('button',{name:'Закрыть меню пользователя'}).click()
      assert.equal(await menu.count(),0)

      const layout=await page.evaluate(()=>({
        viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,
      }))
      assert.ok(layout.html<=width+1&&layout.body<=width+1,
        'topbar overflow at '+width+': '+JSON.stringify(layout))
      assert.deepEqual(errors,[])
    }finally{await context.close()}
  }
})

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const baseURL=process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company='11111111-1111-4111-8111-111111111111'
const employee='77777777-7777-4777-8777-777777777777'
const path='/api/v1/companies/'+company+'/worktime'
async function login(page,email) {
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль',{exact:true}).fill('SyntheticE2E-Only!2026')
  await page.getByRole('button',{name:'Войти',exact:true}).click()
  await page.getByRole('heading',{name:'Главная',exact:true}).waitFor()
  await page.goto('/timesheets')
  await page.locator('input[type=month]').fill('2026-10')
  await page.locator('.period-review__text').waitFor()
}
async function api(page,url,method='GET',body) {
  return page.evaluate(async ({url,method,body})=>{
    const token=document.cookie.split('; ').find(v=>v.startsWith('XSRF-TOKEN='))?.slice(11)
    const response=await fetch(url,{method,credentials:'same-origin',
      headers:{Accept:'application/json','Content-Type':'application/json',...(token?{'X-XSRF-TOKEN':decodeURIComponent(token)}:{})},
      ...(body?{body:JSON.stringify(body)}:{})})
    return {status:response.status,body:await response.json()}
  },{url,method,body})
}
test('real HR/admin period cycle locks edits, enforces two users and reopens with a reason',{timeout:120000},async()=>{
  const browser=await chromium.launch({headless:true})
  const hr=await browser.newPage({baseURL,viewport:{width:1440,height:1000}})
  const admin=await browser.newPage({baseURL,viewport:{width:1440,height:1000}})
  try {
    await login(hr,'synthetic-e2e@example.test')
    const row=hr.getByRole('row').filter({hasText:'Synthetic Employee'})
    await row.getByRole('button',{name:'Заполнить',exact:true}).click()
    const drawer=hr.getByRole('dialog',{name:'Табель сотрудника',exact:true})
    await drawer.getByRole('button',{name:'Заполнить по плану',exact:true}).click()
    await drawer.getByRole('button',{name:'Сохранить табель',exact:true}).click()
    await drawer.getByText('Табель сохранён.',{exact:true}).waitFor()
    await drawer.locator('.drawer-footer').getByRole('button',{name:'Закрыть',exact:true}).click()
    await hr.getByRole('button',{name:'Отправить на утверждение',exact:true}).click()
    await hr.locator('.period-review__text').getByText('На утверждении',{exact:true}).waitFor()
    assert.equal(await row.getByRole('button',{name:'Заполнить',exact:true}).count(),0)
    const forbidden=await api(hr,path+'/timesheet/'+employee,'PUT',{month:'2026-10',days:[{date:'2026-10-15',worked_minutes:480,absence_minutes:0,overtime_minutes:0,revision:1}]})
    assert.equal(forbidden.status,409)
    const selfApproval=await api(hr,path+'/periods/transition','POST',{month:'2026-10',revision:1,action:'approve'})
    assert.equal(selfApproval.status,403)
    await login(admin,'synthetic-period-reviewer@example.test')
    await admin.getByRole('button',{name:'Утвердить период',exact:true}).click()
    await admin.getByText('Утверждено · период закрыт',{exact:true}).waitFor()
    const reason=admin.getByLabel('Причина повторного открытия')
    await reason.fill('abc')
    assert.equal(await admin.getByRole('button',{name:'Открыть для исправления',exact:true}).isDisabled(),true)
    await reason.fill('Correction verified by QA')
    await admin.getByRole('button',{name:'Открыть для исправления',exact:true}).click()
    await admin.locator('.period-review__text').getByText('Черновик',{exact:true}).waitFor()
    const reopened=await api(admin,path+'/periods?month=2026-10')
    assert.equal(reopened.body.data.revision,3)
    assert.equal(reopened.body.data.status,'draft')
    await hr.reload()
    await row.getByRole('button',{name:'Заполнить',exact:true}).waitFor()

    // Create a real stale revision, then hold its actual 409 response while switching months.
    const submit=await api(admin,path+'/periods/transition','POST',{month:'2026-10',revision:3,action:'submit'})
    assert.equal(submit.status,200)
    let release,received
    const receivedPromise=new Promise(resolve=>{received=resolve})
    const releasePromise=new Promise(resolve=>{release=resolve})
    await hr.route('**/worktime/periods/transition',async route=>{
      const response=await route.fetch()
      assert.equal(response.status(),409)
      received()
      await releasePromise
      await route.fulfill({response})
    })
    await hr.getByRole('button',{name:'Отправить на утверждение',exact:true}).click()
    await receivedPromise
    await hr.locator('input[type=month]').fill('2026-11')
    await hr.locator('.period-review__text').getByText('Черновик',{exact:true}).waitFor()
    const staleResponse=hr.waitForResponse(r=>r.url().endsWith('/periods/transition'))
    release()
    await staleResponse
    await hr.unroute('**/worktime/periods/transition')
    assert.equal(await hr.locator('.period-review [role=alert]').count(),0)
    assert.equal((await api(hr,path+'/periods?month=2026-11')).body.data.status,'draft')

    // A failed or pending read must not offer edits. Restoring the real GET unlocks draft editing.
    await hr.route('**/worktime/periods?month=*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA controlled read outage'})}))
    await hr.reload()
    await hr.locator('input[type=month]').fill('2026-11')
    await hr.locator('.period-review [role=alert]').waitFor()
    assert.equal(await hr.getByRole('row').filter({hasText:'Synthetic Employee'}).getByRole('button',{name:'Заполнить',exact:true}).count(),0)
    await hr.unroute('**/worktime/periods?month=*')
    let readArrived,releaseRead
    const readArrivedPromise=new Promise(resolve=>{readArrived=resolve})
    const releaseReadPromise=new Promise(resolve=>{releaseRead=resolve})
    await hr.route('**/worktime/periods?month=2026-11',async route=>{
      const response=await route.fetch()
      readArrived()
      await releaseReadPromise
      await route.fulfill({response})
    })
    await hr.getByRole('button',{name:'Повторить загрузку',exact:true}).click()
    await readArrivedPromise
    assert.equal(await hr.getByRole('row').filter({hasText:'Synthetic Employee'}).getByRole('button',{name:'Заполнить',exact:true}).count(),0)
    releaseRead()
    await hr.getByRole('row').filter({hasText:'Synthetic Employee'}).getByRole('button',{name:'Заполнить',exact:true}).waitFor()
    await hr.unroute('**/worktime/periods?month=2026-11')
  } finally {await browser.close()}
})

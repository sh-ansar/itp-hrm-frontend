import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import fs from 'node:fs'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const sizes = [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[375,812]]
const employeeUrl = '/employees/11111111-1111-4111-8111-111111111111/77777777-7777-4777-8777-777777777777'
const evidence = process.env.HRM_VISUAL_EVIDENCE_DIR
const tabs = ['Личные данные','Организационные данные','Трудовые данные','Документы','Расчёты и начисления','График и табель','Кадровый резерв и обучение','История изменений']

test('ZIP registry geometry and all employee tab states remain usable at six sizes in both themes', { timeout: 240000 }, async () => {
 const browser = await chromium.launch({headless:process.env.HRM_E2E_HEADED !== 'true'})
 try {
  const context = await browser.newContext({baseURL,viewport:{width:1440,height:875},deviceScaleFactor:1})
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  const errors = []
  page.on('pageerror',error=>errors.push(error.message))
  page.on('response',r=>{ if(r.status()>=500 && new URL(r.url()).pathname.startsWith('/api/')) errors.push(r.status()+' '+new URL(r.url()).pathname) })
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button',{name:'Войти',exact:true}).click()
  await page.getByRole('heading',{name:'Главная',exact:true}).waitFor()
  for(const theme of ['light','dark']) {
   for(const [width,height] of sizes) {
    await page.setViewportSize({width,height})
    await page.goto('/employees')
    await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme)
    await page.getByRole('heading',{name:/Реестр сотрудников/}).waitFor()
    await page.locator('.registry-summary-value').first().filter({hasText:'1'}).waitFor()
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,theme+' registry '+width)
    if(width>=1440) {
     const table=page.locator('.registry-desktop-table .table-scroll')
     assert.ok(await table.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Default columns fit reference desktop width')
     const cards=await page.locator('.registry-summary-card').evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().height))
     assert.ok(cards.every(h=>h<=150),'Contract period control must not stretch the KPI row')
    }
    const period = page.locator('.registry-summary-card').last().getByRole('button',{name:'Период',exact:true})
    await period.click()
    await Promise.all([
     page.waitForResponse(r=>r.url().includes('contract_expiry_days=60')&&r.status()===200),
     page.getByRole('menuitem',{name:'договоров истекают в ближайшие 60 дней',exact:true}).click(),
    ])
    await page.locator('.registry-summary-value').first().filter({hasText:'1'}).waitFor()
    if(evidence && width===1440) {fs.mkdirSync(evidence,{recursive:true});await page.screenshot({path:evidence+'/registry-after-'+theme+'.png',fullPage:true})}
    await page.goto(employeeUrl)
    await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme)
    await page.locator('.employee-data-field').first().waitFor()
    const first = page.locator('.employee-profile-section .section-heading h2').first()
    assert.equal(await first.innerText(),'Контакты и адреса')
    const nav=page.getByRole('navigation',{name:'Разделы карточки сотрудника'})
    for(const tab of tabs) {
     await nav.getByRole('button',{name:tab,exact:true}).click()
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,theme+' '+width+' '+tab)
     assert.equal(await page.locator('[data-field-state="informative"] input,[data-field-state="informative"] button').count(),0)
    }
    await nav.getByRole('button',{name:'Личные данные',exact:true}).click()
    const header=await first.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))
    assert.equal(header,width<=600?16:18)
    assert.notEqual(await nav.locator('.view-tab--active').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)')
    if(evidence && width===1440) await page.screenshot({path:evidence+'/card-after-'+theme+'.png',fullPage:true})
   }
  }
  assert.deepEqual(errors,[])
  await context.close()
 } finally {await browser.close()}
})

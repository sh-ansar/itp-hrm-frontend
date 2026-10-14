import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})
const url='http://127.0.0.1:5173'

test('home uses prototype hierarchy and loads all curated SVG assets at four widths',async()=>{
  for(const width of [375,768,1280,1440]){
    const context=await browser.newContext({baseURL:url,viewport:{width,height:920}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    try{
      await page.goto('/')
      await page.getByRole('heading',{name:'Реестр сотрудников'}).waitFor()
      await page.getByRole('heading',{name:'Вакантные позиции'}).last().waitFor()
      assert.equal(await page.locator('.overview-metrics .metric-card').count(),3)
      await page.getByRole('table',{name:'Реестр сотрудников на главной'}).waitFor({timeout:15000})
      await page.getByRole('table',{name:'Вакантные штатные позиции на главной'}).waitFor({timeout:15000})
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
      const dims=await page.evaluate(()=>{
        const nav=document.querySelector('.sidebar')
        const metric=document.querySelector('.overview-metrics')
        const heading=document.querySelector('.dashboard-section-heading h2')
        return {
          nav:nav?.getBoundingClientRect().width??0,
          metrics:metric?.getBoundingClientRect().width??0,
          headingSize:heading?parseFloat(getComputedStyle(heading).fontSize):0,
        }
      })
      assert.ok(dims.headingSize<=23&&dims.headingSize>=18)
      assert.ok(dims.metrics<=width)
      assert.deepEqual(errors,[])
      for(const name of ['Arrow-more.svg','Chart-circle.svg','Business.svg','Filter.svg','Search.svg']){
        const resource=await page.request.get('/prototype-icons/'+name)
        assert.equal(resource.status(),200,name)
      }
      await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'))
      const dark=await page.locator('.metric-card').first().evaluate(node=>getComputedStyle(node).backgroundColor)
      assert.notEqual(dark,'rgb(255, 255, 255)')
    }finally{await context.close()}
  }
})

test('employee dashboard search and status filters use real scoped queries',async()=>{
  const context=await browser.newContext({baseURL:url,viewport:{width:1280,height:800}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  try{
    await page.goto('/')
    const registry=page.getByRole('table',{name:'Реестр сотрудников на главной'})
    await registry.getByText('Садыков Арман Ерланович').waitFor()
    const sortable=registry.getByRole('button',{name:'Сортировать: Таб. №'})
    await sortable.click()
    const firstAscending=await registry.getByRole('row').nth(1).innerText()
    await sortable.click()
    const firstDescending=await registry.getByRole('row').nth(1).innerText()
    assert.notEqual(firstAscending,firstDescending,'Sorting must change actual row order')
    await page.getByRole('button',{name:'Открыть поиск: Поиск сотрудников'}).click()
    const search=page.getByRole('searchbox',{name:'Поиск сотрудников'})
    await search.fill('EMP-0002')
    const form=page.getByRole('search').filter({has:search})
    await form.getByRole('button',{name:'Найти'}).click()
    await registry.getByText('Ибраева Алия Сериковна').waitFor()
    assert.equal(await registry.getByRole('row').count(),2,'one header and one matching employee')
    await search.fill('')
    await form.getByRole('button',{name:'Найти'}).click()
    await page.getByRole('button',{name:'Открыть фильтры: Поиск сотрудников'}).click()
    await page.getByRole('combobox',{name:'Статус сотрудника'}).selectOption('archived')
    await registry.getByText('В архиве').first().waitFor()
    assert.deepEqual(errors,[])
  }finally{await context.close()}
})

test('vacancy search and department filters only show matching real staffing rows',async()=>{
  const context=await browser.newContext({baseURL:url,viewport:{width:1280,height:800}})
  const page=await context.newPage()
  try{
    await page.goto('/')
    const table=page.getByRole('table',{name:'Вакантные штатные позиции на главной'})
    await table.getByRole('row').nth(1).waitFor()
    await page.getByRole('button',{name:'Открыть поиск: Поиск вакансий'}).click()
    const search=page.getByRole('searchbox',{name:'Поиск вакансий'})
    await search.fill('НЕСУЩЕСТВУЮЩАЯ ВАКАНСИЯ')
    await page.getByRole('search').filter({has:search}).getByRole('button',{name:'Найти'}).click()
    await page.getByText('Вакантных позиций нет').waitFor()
    await search.fill('')
    await page.getByRole('search').filter({has:search}).getByRole('button',{name:'Найти'}).click()
    await table.getByRole('row').nth(1).waitFor()
    await page.getByRole('button',{name:'Открыть фильтры: Поиск вакансий'}).click()
    const choose=page.getByRole('combobox',{name:'Подразделение'})
    assert.ok(await choose.locator('option').count()>1)
    await choose.selectOption({index:1})
    assert.ok(await table.getByRole('row').count()>1)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  }finally{await context.close()}
})

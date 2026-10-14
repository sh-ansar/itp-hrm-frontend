import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL='http://127.0.0.1:5173'
const employeeUrl='/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})

test('working screens honor saved UI date format preferences',async()=>{
  const context=await browser.newContext({baseURL,viewport:{width:1280,height:900}})
  const page=await context.newPage()
  try{
    await page.goto(employeeUrl)
    await page.getByRole('button',{name:'Личные данные',exact:true}).click()
    const birthField=page.locator('.employee-data-field').filter({hasText:'Дата рождения'}).first()
    await birthField.waitFor()
    const initial=(await birthField.locator('strong').innerText()).trim()
    assert.notEqual(initial,'—','demo employee must expose a birth date for the format check')

    await page.evaluate(()=>{
      localStorage.setItem('hrm-date-format','yyyy-mm-dd')
      localStorage.setItem('hrm-number-format','comma')
      localStorage.setItem('hrm-time-zone','Asia/Almaty')
    })
    await page.reload()
    await page.getByRole('button',{name:'Личные данные',exact:true}).click()
    const iso=(await page.locator('.employee-data-field').filter({hasText:'Дата рождения'}).first().locator('strong').innerText()).trim()
    assert.match(iso,/^\d{4}-\d{2}-\d{2}$/)
    assert.notEqual(iso,initial,'date format setting must change the working card output')

    await page.evaluate(()=>{
      localStorage.setItem('hrm-date-format','dd/mm/yyyy')
    })
    await page.reload()
    await page.getByRole('button',{name:'Личные данные',exact:true}).click()
    const slash=(await page.locator('.employee-data-field').filter({hasText:'Дата рождения'}).first().locator('strong').innerText()).trim()
    assert.match(slash,/^\d{2}\/\d{2}\/\d{4}$/)
  }finally{
    await context.close()
  }
})

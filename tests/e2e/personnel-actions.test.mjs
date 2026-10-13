import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})

async function login(page){
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button',{name:'Войти'}).click()
  await page.getByRole('heading',{name:'Главная'}).waitFor()
}

async function openActionForSynthetic(page){
  await page.getByRole('button',{name:'Новое действие'}).click()
  const dialog=page.getByRole('dialog',{name:'Новое кадровое действие'})
  await dialog.waitFor()
  await dialog.getByLabel('Поиск сотрудника').fill('E2E-001')
  await dialog.getByRole('button',{name:'Найти'}).click()
  await dialog.getByText(/Текущее назначение|Открытого назначения нет/).waitFor()
  return dialog
}

test('HR conducts transfer termination and rehire through personnel actions workspace',async()=>{
  const context=await browser.newContext({
    baseURL:'http://127.0.0.1:5173',
    viewport:{width:375,height:850},
  })
  const page=await context.newPage()
  try{
    await login(page)
    await page.goto('/personnel-actions')
    await page.getByRole('heading',{name:'Кадровые процессы',exact:true,level:1}).waitFor()

    let dialog=await openActionForSynthetic(page)
    await dialog.getByLabel('Кадровое действие').selectOption('transfer')
    await dialog.getByLabel('Дата действия').fill('2026-10-01')
    await dialog.getByLabel('Основание').fill('ORDER-E2E-TRANSFER')
    await dialog.getByLabel('Подразделение').selectOption({label:'Visible Finance Child'})
    await dialog.getByLabel('Должность').selectOption({label:'Test Engineer'})
    await dialog.getByRole('button',{name:/Провести: Перевод/}).click()

    const transferRow=page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-TRANSFER' })
    await Promise.race([
      transferRow.waitFor({timeout:10000}),
      dialog.getByRole('alert').waitFor({timeout:10000}).then(async()=>{throw new Error('Transfer rejected: '+await dialog.getByRole('alert').innerText())}),
    ])
    assert.match(await transferRow.innerText(),/Перевод/)
    assert.match(await transferRow.innerText(),/Visible Finance.*Visible Finance Child/)

    dialog=await openActionForSynthetic(page)
    await dialog.getByLabel('Кадровое действие').selectOption('termination')
    await dialog.getByLabel('Дата действия').fill('2026-10-10')
    await dialog.getByLabel('Основание').fill('ORDER-E2E-TERM')
    await dialog.getByRole('button',{name:/Провести: Увольнение/}).click()

    const terminationRow=page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-TERM' })
    await terminationRow.waitFor()
    assert.match(await terminationRow.innerText(),/Увольнение/)
    assert.match(await terminationRow.innerText(),/прекращено/)

    await page.goto('/employees')
    await page.locator('.employee-mobile-card').filter({ hasText: 'E2E-001' }).getByRole('link', { name: /Открыть карточку/ }).click()
    await page.locator('.employee-page-heading h1').waitFor()
    await page.getByText('Нет активного назначения',{exact:true}).waitFor()
    await page.goto('/personnel-actions')
    await page.getByRole('heading',{name:'Кадровые процессы',exact:true,level:1}).waitFor()

    dialog=await openActionForSynthetic(page)
    await dialog.getByLabel('Кадровое действие').selectOption('hire')
    await dialog.getByLabel('Дата действия').fill('2026-10-15')
    await dialog.getByLabel('Основание').fill('ORDER-E2E-REHIRE')
    await dialog.getByLabel('Подразделение').selectOption({label:'Visible Finance'})
    await dialog.getByLabel('Должность').selectOption({label:'Test Engineer'})
    await dialog.getByRole('button',{name:/Провести: Приём на работу/}).click()

    const hireRow=page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-REHIRE' })
    await hireRow.waitFor()
    assert.match(await hireRow.innerText(),/Приём/)
    assert.equal(await page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-' }).count(),3)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false)
  }finally{
    await context.close()
  }
})

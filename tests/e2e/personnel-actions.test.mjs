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
  await dialog.locator('.employee-summary').getByText(/Текущее назначение|Открытого назначения нет/).waitFor()
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
    await dialog.getByRole('button',{name:/Продолжить: Перевод/}).click()
    let confirmation=page.getByRole('dialog',{name:'Подтверждение кадрового действия'})
    await confirmation.getByText('Visible Finance Child',{exact:true}).waitFor()
    assert.equal(await page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-TRANSFER' }).count(),0,
      'Transfer must not execute at preflight stage')
    await confirmation.getByRole('button',{name:'Вернуться'}).click()
    await confirmation.waitFor({state:'hidden'})
    assert.equal(await page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-TRANSFER' }).count(),0,
      'Cancelling preflight must not mutate staffing')
    await dialog.getByRole('button',{name:/Продолжить: Перевод/}).click()
    confirmation=page.getByRole('dialog',{name:'Подтверждение кадрового действия'})
    await confirmation.getByRole('button',{name:'Подтвердить и провести'}).click()

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
    await dialog.getByRole('button',{name:/Продолжить: Увольнение/}).click()
    confirmation=page.getByRole('dialog',{name:'Подтверждение кадрового действия'})
    await confirmation.getByText('Увольнение',{exact:true}).waitFor()
    assert.equal(await page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-TERM' }).count(),0,
      'Termination is not applied before the final confirmation')
    await confirmation.getByRole('button',{name:'Подтвердить и провести'}).click()

    const terminationRow=page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-TERM' })
    await terminationRow.waitFor()
    assert.match(await terminationRow.innerText(),/Увольнение/)
    assert.match(await terminationRow.innerText(),/прекращено/)

    await page.goto('/employees?status=archived')
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
    await dialog.getByRole('button',{name:/Продолжить: Приём на работу/}).click()
    confirmation=page.getByRole('dialog',{name:'Подтверждение кадрового действия'})
    await confirmation.getByText('Visible Finance',{exact:true}).waitFor()
    await confirmation.getByRole('button',{name:'Подтвердить и провести'}).click()

    const hireRow=page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-REHIRE' })
    await hireRow.waitFor()
    assert.match(await hireRow.innerText(),/Приём/)
    assert.equal(await page.locator('.action-mobile-card').filter({ hasText: 'ORDER-E2E-' }).count(),3)
    // A page reload must not discard rehire or silently reactivate the old assignment.
    await page.reload()
    for (const reference of ['ORDER-E2E-TRANSFER', 'ORDER-E2E-TERM', 'ORDER-E2E-REHIRE']) {
      await page.locator('.action-mobile-card').filter({ hasText: reference }).waitFor({ timeout: 15000 })
    }
    await page.goto('/employees?status=active')
    await page.locator('.employee-mobile-card').filter({ hasText: 'E2E-001' })
      .getByRole('link', { name: /Открыть карточку/ }).click()
    // Verify the employment assignment in the organizational tab, not the default
    // personal-data tab. The previous check could not find a field not rendered there.
    await page.getByRole('button', { name: 'Организационные данные', exact: true }).click()
    await page.getByText('Visible Finance', { exact: true }).first().waitFor({ timeout: 15000 })
    await page.getByText('15.10.2026', { exact: false }).first().waitFor({ timeout: 15000 })
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false)
  }finally{
    await context.close()
  }
})

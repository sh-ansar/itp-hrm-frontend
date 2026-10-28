import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAwCAIAAAD/zu84AAAAMklEQVR4nO3NMQEAMAjAsLEH/xf2kIIJ+FIBTWT1u+yf3gEAAAAAAAAAAAAAAAAAAMsNnL0B3qg0SJcAAAAASUVORK5CYII=','base64')

test('employee photo pencil stages the full-size image until save, supports cancel and private removal on mobile',async()=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:5173',viewport:{width:375,height:900}})
 const page=await context.newPage()
 const failures=[]
 page.on('pageerror',error=>failures.push(error.message))
 let uploads=0
 page.on('request',request=>{
  if(request.method()==='POST' && /\/employees\/[^/]+\/photo$/.test(request.url()))uploads++
 })
 try{
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test')
  await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026')
  await page.getByRole('button',{name:'Войти'}).click()
  await page.getByRole('heading',{name:'Главная',level:1}).waitFor()
  await page.goto('/employees/11111111-1111-4111-8111-111111111111/77777777-7777-4777-8777-777777777777')
  const photoInput=page.locator('.identity-photo-section input.photo-input')
  await photoInput.waitFor({state:'attached'})
  assert.equal(await page.getByRole('button',{name:'Изменить карточку'}).count(),0)
  await photoInput.setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:pixel})
  const photo=page.locator('.identity-photo-section .avatar img')
  await photo.waitFor()
  assert.equal(uploads,0,'Staged photo must not upload without an explicit Save')
  await page.locator('.photo-compact-save').getByRole('button',{name:'Сохранить'}).click()
  await photo.waitFor()
  await photo.evaluate(img=>img.decode())
  assert.equal(await photo.evaluate(img=>img.naturalWidth>0),true)
  assert.equal(await photo.evaluate(img=>getComputedStyle(img).objectFit),'contain')
  await page.reload()
  await photo.waitFor()
  const uploadsAfterFirst=uploads
  await photoInput.setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:pixel})
  assert.equal(uploads,uploadsAfterFirst)
  await page.locator('.photo-compact-save').getByRole('button',{name:'Сохранить'}).click()
  await page.reload()
  await photo.waitFor()
  await page.locator('.identity-photo-section input.photo-input').waitFor({state:'attached'})

  await photoInput.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg></svg>')})
  await page.locator('.identity-photo-section').getByText(/JPG или PNG/).waitFor()
  await photoInput.setInputFiles({name:'discard.png',mimeType:'image/png',buffer:pixel})
  page.once('dialog',async dialog=>{assert.match(dialog.message(),/несохранённ/);await dialog.dismiss()})
  await page.getByRole('navigation',{name:'Разделы карточки сотрудника'})
    .getByRole('button',{name:'История изменений'}).click()
  assert.equal(await page.locator('.photo-compact-save').count(),1)
  await page.locator('.photo-compact-save').getByRole('button',{name:'Отмена'}).click()
  assert.equal(await page.locator('.photo-compact-save').count(),0)
  await page.locator('.identity-photo-section .photo-preview-trigger').click()
  const viewer=page.getByRole('dialog',{name:/Фото сотрудника:/})
  await viewer.waitFor()
  page.once('dialog',async dialog=>{await dialog.accept()})
  await viewer.getByRole('button',{name:'Удалить фотографию'}).click()
  await page.reload()
  assert.equal(await photo.count(),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  assert.deepEqual(failures,[])
 }finally{await context.close()}
})

test('creating with photo retries only the image after upload failure and never duplicates the employee',async()=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:960}});const page=await context.newPage();let creates=0;let failOnce=true
 page.on('request',request=>{if(request.method()==='POST' && /\/api\/v1\/companies\/[^/]+\/employees$/.test(request.url())) creates++})
 await page.route(/\/api\/v1\/companies\/[^/]+\/employees\/[^/]+\/photo$/,route=>{if(route.request().method()==='POST' && failOnce){failOnce=false;return route.fulfill({status:500,contentType:'application/json',body:'{"message":"Synthetic upload failure"}'})}return route.continue()})
 try{
  await page.goto('/login');await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test');await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026');await page.getByRole('button',{name:'Войти'}).click();await page.getByRole('heading',{name:'Главная',level:1}).waitFor()
  await page.goto('/employees');await page.getByRole('button',{name:'Добавить сотрудника',exact:true}).click();const drawer=page.getByRole('dialog',{name:'Добавить сотрудника'});await drawer.waitFor();await drawer.getByLabel('Табельный номер').fill('E2E-PHOTO-CREATE');await drawer.getByLabel('Фамилия').fill('Фото');await drawer.getByLabel('Имя').fill('Новый');await drawer.getByLabel('Фото для карточки сотрудника').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:pixel});await drawer.getByRole('button',{name:'Добавить сотрудника',exact:true}).click()
  await drawer.getByText(/Данные карточки сохранены\. Фото не загрузилось/).waitFor();await drawer.getByRole('button',{name:'Повторить загрузку фото',exact:true}).click();await page.getByRole('img',{name:'Фото: Фото Новый',exact:true}).waitFor();assert.equal(creates,1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
 }finally{await context.close()}
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
let browser
before(async()=>{browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close()})
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAwCAIAAAD/zu84AAAAMklEQVR4nO3NMQEAMAjAsLEH/xf2kIIJ+FIBTWT1u+yf3gEAAAAAAAAAAAAAAAAAAMsNnL0B3qg0SJcAAAAASUVORK5CYII=','base64')

test('protected employee photo persists, replaces, rejects invalid files and removes on mobile',async()=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:5173',viewport:{width:375,height:900}})
 const page=await context.newPage();const failures=[];page.on('pageerror',error=>failures.push(error.message))
 try{
  await page.goto('/login');await page.getByLabel('Электронная почта').fill('synthetic-e2e@example.test');await page.getByLabel('Пароль').fill('SyntheticE2E-Only!2026');await page.getByRole('button',{name:'Войти'}).click();await page.getByRole('heading',{name:'Главная',level:1}).waitFor()
  await page.goto('/employees/11111111-1111-4111-8111-111111111111/77777777-7777-4777-8777-777777777777');await page.getByRole('button',{name:'Изменить фото',exact:true}).click();await page.getByRole('dialog',{name:'Изменить фотографию'}).waitFor();await page.getByRole('button',{name:'Загрузить фото',exact:true}).waitFor()
  const input=page.getByLabel('Выбрать фото сотрудника');await input.setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:pixel});const photo=page.getByRole('img',{name:/Фото: Synthetic Employee/}).first();await photo.waitFor();await photo.evaluate(img=>img.decode());assert.equal(await photo.evaluate(img=>img.naturalWidth>0),true)
  await page.reload();await photo.waitFor();await page.getByRole('button',{name:'Изменить фото',exact:true}).click();await page.getByRole('button',{name:'Заменить фото',exact:true}).waitFor();await input.setInputFiles({name:'replaced.png',mimeType:'image/png',buffer:pixel});await photo.waitFor();await page.getByRole('button',{name:'Изменить фото',exact:true}).click();await page.getByRole('button',{name:'Заменить фото',exact:true}).waitFor()
  await input.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg></svg>')});await page.getByText('Выберите JPG или PNG размером до 5 МБ',{exact:true}).waitFor();assert.equal(await photo.count(),1)
  await page.getByRole('button',{name:'Удалить фото',exact:true}).click();await page.getByRole('button',{name:'Изменить фото',exact:true}).click();await page.getByRole('dialog',{name:'Изменить фотографию'}).waitFor();await page.getByRole('button',{name:'Загрузить фото',exact:true}).waitFor();assert.equal(await photo.count(),0);await page.reload();await page.getByRole('button',{name:'Изменить фото',exact:true}).waitFor()
  await page.getByRole('button',{name:'История изменений',exact:true}).click();await page.getByRole('cell',{name:'Удалено фото сотрудника',exact:true}).waitFor();assert.equal(await page.getByRole('cell',{name:'Обновлено фото сотрудника',exact:true}).count(),2);assert.deepEqual(failures,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
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

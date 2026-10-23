import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'

test('organization viewport pans, zooms at pointer, fits and preserves position through expanded mode', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ baseURL, viewport:{width:1440,height:1000} })
    await page.goto('/organization')
    await page.getByRole('button', {name:'Схема',exact:true}).click()
    await page.locator('.organization-chart').waitFor()
    const viewport = page.locator('.org-chart-viewport')
    const content = page.locator('.org-chart-content')
    const matrix = () => content.evaluate(el => {
      const m = new DOMMatrix(getComputedStyle(el).transform)
      return {scale:m.a,x:m.e,y:m.f}
    })
    await page.getByRole('button',{name:'Вместить схему',exact:true}).click()
    assert.ok(await viewport.evaluate(el => {
      const bounds=el.getBoundingClientRect()
      return [...el.querySelectorAll('.tree-card')].every(card=>{
        const box=card.getBoundingClientRect()
        return box.left>=bounds.left-1 && box.right<=bounds.right+1
      })
    }), 'Fit must include left-overflowing branches')
    const initial = await matrix()
    const box = await viewport.boundingBox()
    await page.mouse.move(box.x+50,box.y+40)
    await page.mouse.down()
    await page.mouse.move(box.x+150,box.y+90,{steps:6})
    await page.mouse.up()
    const panned = await matrix()
    assert.ok(Math.abs(panned.x-initial.x-100)<1)
    assert.ok(Math.abs(panned.y-initial.y-50)<1)
    await page.mouse.wheel(0,-180)
    await page.waitForFunction(before => new DOMMatrix(getComputedStyle(document.querySelector('.org-chart-content')).transform).a > before, panned.scale)
    const zoomed = await matrix()
    assert.ok(zoomed.scale>panned.scale)
    await viewport.focus()
    await page.keyboard.press('ArrowRight')
    assert.ok(Math.abs((await matrix()).x-zoomed.x+40)<1)
    const beforeExpand = await matrix()
    await page.getByRole('button',{name:'Развернуть схему',exact:true}).click()
    assert.equal(await page.locator('.org-chart-workspace--expanded').count(),1)
    assert.deepEqual(await matrix(),beforeExpand)
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('.org-chart-workspace--expanded').count(),0)
    assert.deepEqual(await matrix(),beforeExpand)
    await page.getByRole('button',{name:'Сбросить масштаб',exact:true}).click()
    assert.equal((await matrix()).scale,1)
    // Interactive branches remain clickable after a drag; do not capture controls as pan gestures.
    const branch = page.locator('.org-chart-content button').first()
    if (await branch.count()) {
      await page.getByRole('button',{name:'Вместить схему',exact:true}).click()
      await branch.click()
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1))
    await page.close()
  } finally { await browser.close() }
})

test('mobile touch pan, viewport reset and localized expansion controls remain available', async () => {
  const browser = await chromium.launch({ headless:true })
  try {
    const labels = { ru:['Схема','Развернуть схему'], kk:['Сызба','Сызбаны толық ашу'], en:['Chart','Expand chart'], ka:['სქემა','სქემის გაშლა'] }
    for (const [locale, names] of Object.entries(labels)) {
      const page = await browser.newPage({baseURL,viewport:{width:375,height:850},hasTouch:true})
      try {
        await page.addInitScript(value=>localStorage.setItem('hrm-locale',value),locale)
        await page.goto('/organization')
        // The view tab has stable data-independent order; its translated accessible name is verified separately.
        await page.locator('.structure-tabs button').nth(1).click()
        await page.locator('.organization-chart').waitFor()
        const expand = page.getByRole('button',{name:names[1],exact:true})
        await expand.click()
        const viewport = page.locator('.org-chart-viewport')
        assert.equal(await viewport.evaluate(el=>getComputedStyle(el).touchAction),'none')
        const old = await page.locator('.org-chart-content').evaluate(el=>getComputedStyle(el).transform)
        const errors = []
        page.on('pageerror',error=>errors.push(error.message))
        const cdp = await page.context().newCDPSession(page)
        const box = await viewport.boundingBox()
        const start = {x:box.x+40,y:box.y+40,id:1}
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...start,x:start.x+40,y:start.y+40}]})
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
        await cdp.detach()
        assert.deepEqual(errors,[])
        assert.notEqual(await page.locator('.org-chart-content').evaluate(el=>getComputedStyle(el).transform),old)
        await page.keyboard.press('Escape')
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1))
      } finally {await page.close()}
    }
  } finally {await browser.close()}
})

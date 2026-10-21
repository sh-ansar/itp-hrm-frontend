import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

const baseURL = 'http://127.0.0.1:5173'

test('staffing history begins empty and reflects real mobile version and line operations', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 850 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const tabs = page.getByRole('navigation', { name: 'Разделы оргструктуры и штатного расписания' })
  try {
    await page.goto('/staffing?view=changes')
    await page.getByRole('heading', { name: 'Изменения штатного расписания', level: 1 }).waitFor()
    await page.locator('.staffing-history-mobile').getByText('История изменений пока пуста.').waitFor()
    await tabs.getByRole('button', { name: 'Штатное расписание', exact: true }).click()
    await page.getByRole('button', { name: 'Новая версия' }).click()
    const versionForm = page.getByRole('dialog', { name: 'Новая версия штатного расписания' })
    await versionForm.getByLabel('Название версии').fill('QA штатный план 2040')
    await versionForm.getByLabel('Действует с').fill('2040-01-01')
    await versionForm.getByLabel('Действует по').fill('2040-12-31')
    await versionForm.getByRole('button', { name: 'Создать версию' }).click()
    await page.getByRole('heading', { name: 'QA штатный план 2040' }).waitFor()
    await page.getByRole('button', { name: 'Добавить строку' }).click()
    const lineForm = page.getByRole('dialog', { name: 'Новая штатная единица' })
    await lineForm.getByLabel('Подразделение').selectOption('00000000-0000-4000-8000-000000000105')
    await lineForm.getByLabel('Должность').selectOption('00000000-0000-4000-8000-000000000305')
    await lineForm.getByLabel('Количество ставок').fill('2.5')
    await lineForm.getByRole('button', { name: 'Добавить в штат' }).click()
    await lineForm.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Утвердить' }).first().click()
    const approval = page.getByRole('dialog', { name: 'Утвердить штатное расписание' })
    await approval.getByRole('button', { name: 'Утвердить' }).click()
    await page.locator('.plan-status.approved').waitFor()
    await tabs.getByRole('button', { name: 'Изменения штатного расписания' }).click()
    await page.getByRole('heading', { name: 'Изменения штатного расписания', level: 1 }).waitFor()
    const cards = page.locator('.staffing-history-card')
    await cards.first().waitFor()
    assert.equal(await cards.count(), 3, 'plan created, line created and approved')
    assert.match(await cards.nth(0).innerText(), /Утверждение штатного расписания/)
    assert.match(await cards.nth(1).innerText(), /Ввод штатной позиции/)
    assert.match(await cards.nth(2).innerText(), /Создание версии/)
    assert.deepEqual(pageErrors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

test('the demo staffing API rejects false success and records only accepted mutations', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const { mockApiRequest: request } = await import('/src/mocks/mockApi.ts')
      const company = '11111111-1111-4111-8111-111111111111'
      const plans = `/companies/${company}/staffing-plans`
      const history = `/companies/${company}/staffing-history`
      const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
      const expectReject = async fn => { try { await fn(); return false } catch { return true } }
      const initial = await request(history)
      const invalidPlan = await expectReject(() => request(plans, {
        method: 'POST', body: JSON.stringify({ name: '', valid_from: '2045-12-31', valid_to: '2045-01-01' }),
      }))
      const created = (await request(plans, {
        method: 'POST', body: JSON.stringify({ name: 'QA version 2050', valid_from: '2050-01-01', valid_to: '2050-12-31' }),
      })).data
      const linePath = `${plans}/${created.id}/lines`
      const payload = { department_id: id(105), position_id: id(305), planned_units: 1.5, base_salary: 200000, currency: 'KZT', notes: null }
      const invalidUnits = await expectReject(() => request(linePath, {
        method: 'POST', body: JSON.stringify({ ...payload, planned_units: -1 }),
      }))
      const createdLine = (await request(linePath, { method: 'POST', body: JSON.stringify(payload) })).data
      const original = await request(`${plans}/${created.id}`)
      const lineUpdate = { ...payload, planned_units: 2.75 }
      const updated = (await request(`${linePath}/${createdLine.id}`, {
        method: 'PUT', body: JSON.stringify({ ...lineUpdate, revision: createdLine.revision }),
      })).data
      const staleRejected = await expectReject(() => request(`${linePath}/${createdLine.id}`, {
        method: 'PUT', body: JSON.stringify({ ...payload, revision: createdLine.revision }),
      }))
      const duplicateRejected = await expectReject(() => request(linePath, {
        method: 'POST', body: JSON.stringify(payload),
      }))
      const another = (await request(linePath, {
        method: 'POST', body: JSON.stringify({ ...payload, position_id: id(306), planned_units: 1 }),
      })).data
      const staleApproval = await expectReject(() => request(`${plans}/${created.id}/approve`, {
        method: 'POST', body: JSON.stringify({ revision: 99 }),
      }))
      const approved = (await request(`${plans}/${created.id}/approve`, {
        method: 'POST', body: JSON.stringify({ revision: created.revision }),
      })).data
      const approvedEditRejected = await expectReject(() => request(`${linePath}/${createdLine.id}`, {
        method: 'PUT', body: JSON.stringify({ ...payload, revision: updated.revision }),
      }))
      const overlapApprovalRejected = await (async () => {
        const conflicting = (await request(plans, { method: 'POST', body: JSON.stringify({
          name: 'QA overlapping period', valid_from: '2050-06-01', valid_to: '2050-09-30',
        }) })).data
        await request(`${plans}/${conflicting.id}/lines`, {
          method: 'POST', body: JSON.stringify({ ...payload, position_id: id(307) }),
        })
        return expectReject(() => request(`${plans}/${conflicting.id}/approve`, {
          method: 'POST', body: JSON.stringify({ revision: conflicting.revision }),
        }))
      })()
      const after = await request(history)
      const entries = after.data.filter(event => event.staffing_plan_id === created.id)
      const current = await request(`${plans}/${created.id}`)
      const clonedResponse = (await request(`${plans}/${created.id}`)).lines[0]
      clonedResponse.notes = 'Tampered response, not source'
      const persisted = (await request(`${plans}/${created.id}`)).lines[0].notes
      const planPagesBefore = await request(plans)
      for (let i = 0; i < 26; i++) {
        await request(plans, { method: 'POST', body: JSON.stringify({
          name: `QA pagination plan ${i + 1}`, valid_from: `${2060 + i}-01-01`, valid_to: null,
        }) })
      }
      const histFirst = await request(`${history}?page=1`)
      const histSecond = await request(`${history}?page=2`)
      const plansSecond = await request(`${plans}?page=2`)
      return {
        initiallyEmpty: initial.meta.total === 0,
        invalidPlan, invalidUnits, staleRejected, duplicateRejected, staleApproval,
        approvedEditRejected, overlapApprovalRejected,
        historyCount: entries.length,
        actions: entries.map(row => row.action),
        recordIds: entries.map(row => row.staffing_line_id),
        lineRevision: current.lines.find(row => row.id === createdLine.id)?.revision,
        originalUnits: original.lines.find(row => row.id === createdLine.id)?.planned_units,
        updatedUnits: current.lines.find(row => row.id === createdLine.id)?.planned_units,
        approved: approved.status === 'approved' && current.data.status === 'approved',
        clonedCorrectly: persisted !== 'Tampered response, not source',
        historyPages: [histFirst.meta.total, histFirst.meta.last_page, histFirst.data.length, histSecond.data.length],
        planPagination: [planPagesBefore.meta.total, plansSecond.meta.total, plansSecond.data.length],
        uniqueIds: another.id !== createdLine.id,
        historyReferences: entries.every(event => event.staffing_plan_id === created.id),
      }
    })
    assert.deepEqual(result, {
      initiallyEmpty: true, invalidPlan: true, invalidUnits: true, staleRejected: true,
      duplicateRejected: true, staleApproval: true, approvedEditRejected: true,
      overlapApprovalRejected: true,
      historyCount: 5,
      actions: [
        'staffing.plan_approved', 'staffing.plan_line_created', 'staffing.plan_line_updated',
        'staffing.plan_line_created', 'staffing.plan_created',
      ],
      recordIds: [null, result.recordIds[1], result.recordIds[2], result.recordIds[3], null],
      lineRevision: 2, originalUnits: 1.5, updatedUnits: 2.75, approved: true,
      clonedCorrectly: true, historyPages: [33, 2, 25, 8],
      planPagination: [4, 30, 5], uniqueIds: true, historyReferences: true,
    })
    assert.ok(result.recordIds.slice(1, 4).every(Boolean))
  } finally {
    await context.close()
  }
})


test('staffing snapshot counts employees on the requested date, including transfers', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const { mockApiRequest: request } = await import('/src/mocks/mockApi.ts')
      const company='11111111-1111-4111-8111-111111111111'
      const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
      const plans=`/companies/${company}/staffing-plans`
      const created=(await request(plans,{method:'POST',body:JSON.stringify({
        name:'QA timed staffing',valid_from:'2044-01-01',valid_to:'2044-12-31',
      })})).data
      const lines=`${plans}/${created.id}/lines`
      await request(lines,{method:'POST',body:JSON.stringify({
        department_id:id(105),position_id:id(305),planned_units:1,
        base_salary:null,currency:null,notes:null,
      })})
      await request(lines,{method:'POST',body:JSON.stringify({
        department_id:id(106),position_id:id(306),planned_units:3,
        base_salary:null,currency:null,notes:null,
      })})
      const snapshot=async date=>(await request(`${plans}/${created.id}?as_of=${date}`)).lines
      const find=(rows,department,position)=>rows.find(row=>row.department_id===id(department)&&row.position_id===id(position))
      const beforeHire=await snapshot('2021-12-31')
      const beforeTransfer=await snapshot('2026-11-14')
      await request(`/companies/${company}/employees/${id(1000)}/personnel-actions/transfer`, {
        method:'POST',
        body:JSON.stringify({
          department_id:id(106),position_id:id(306),effective_on:'2026-11-15',
          basis_reference:'QA as-of transfer',
        }),
      })
      const afterTransfer=await snapshot('2026-11-15')
      const historicalAgain=await snapshot('2026-11-14')
      const invalidDate=await (async()=>{
        try{await snapshot('2026-02-31');return false}catch{return true}
      })()
      const roster=await request(`/companies/${company}/employees?status=active`)
      return {
        beforeHire:find(beforeHire,105,305)?.occupied_units,
        beforeTransfer:find(beforeTransfer,105,305)?.occupied_units,
        afterTransfer:find(afterTransfer,105,305)?.occupied_units,
        oldVacantAfter:find(afterTransfer,105,305)?.vacant_units,
        newBefore:find(beforeTransfer,106,306)?.occupied_units,
        newAfter:find(afterTransfer,106,306)?.occupied_units,
        historicalStable:find(historicalAgain,105,305)?.occupied_units===find(beforeTransfer,105,305)?.occupied_units,
        newOverstaffed:find(afterTransfer,106,306)?.overstaffed_units,
        invalidDate,
        expiringIsNotInvented:roster.meta.registry_summary?.expiring_contracts===null,
      }
    })
    assert.equal(result.beforeHire,0)
    assert.equal(result.beforeTransfer,1)
    assert.equal(result.afterTransfer,0)
    assert.equal(result.oldVacantAfter,1)
    assert.equal(result.newAfter,result.newBefore+1)
    assert.equal(result.historicalStable,true)
    assert.equal(result.newOverstaffed,0)
    assert.equal(result.invalidDate,true)
    assert.equal(result.expiringIsNotInvented,true)
  } finally {
    await context.close()
  }
})

test('the existing staffing date filter updates mobile occupancy and vacancy counters', async () => {
  const context = await browser.newContext({ baseURL, viewport:{width:375,height:850} })
  const page = await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  try {
    await page.goto('/staffing')
    await page.getByRole('button',{name:'Новая версия'}).click()
    const version=page.getByRole('dialog',{name:'Новая версия штатного расписания'})
    await version.getByLabel('Название версии').fill('QA slice 2045')
    await version.getByLabel('Действует с').fill('2045-01-01')
    await version.getByLabel('Действует по').fill('2045-12-31')
    await version.getByRole('button',{name:'Создать версию'}).click()
    await page.getByRole('heading',{name:'QA slice 2045'}).waitFor()
    await page.getByRole('button',{name:'Добавить строку'}).click()
    const line=page.getByRole('dialog',{name:'Новая штатная единица'})
    await line.getByLabel('Подразделение').selectOption('00000000-0000-4000-8000-000000000105')
    await line.getByLabel('Должность').selectOption('00000000-0000-4000-8000-000000000305')
    await line.getByLabel('Количество ставок').fill('1')
    await line.getByRole('button',{name:'Добавить в штат'}).click()
    await line.waitFor({state:'hidden'})
    await page.getByLabel('Дата среза занятости').fill('2021-12-31')
    await page.getByRole('button',{name:'Показать на дату'}).click()
    const metrics=page.locator('.staffing-summary-item')
    await metrics.nth(1).getByText('0',{exact:true}).waitFor()
    await metrics.nth(2).getByText('1',{exact:true}).waitFor()
    await page.getByLabel('Дата среза занятости').fill('2026-10-14')
    await page.getByRole('button',{name:'Показать на дату'}).click()
    await metrics.nth(1).getByText('1',{exact:true}).waitFor()
    await metrics.nth(2).getByText('0',{exact:true}).waitFor()
    assert.deepEqual(errors,[])
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
  } finally {
    await context.close()
  }
})


test('staffing, vacancies and audit history support scoped checkbox exports without bulk writes', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    const tabs = page.getByRole('navigation', { name: 'Разделы оргструктуры и штатного расписания' })
    await page.goto('/staffing')
    const lines = page.getByRole('region', { name: 'Строки штатного расписания' })
    await lines.waitFor()
    await lines.locator('tbody input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: 'Снять выделение' }).waitFor()
    const selectedDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Экспорт CSV' }).click()
    assert.equal((await selectedDownload).suggestedFilename(), 'staffing-selected.csv')

    await tabs.getByRole('button', { name: 'Вакантные позиции' }).click()
    await page.getByRole('heading', { name: 'Вакантные позиции', level: 1 }).waitFor()
    await lines.locator('tbody input[type="checkbox"]').first().waitFor()
    assert.equal(await lines.locator('tbody input[type="checkbox"]:checked').count(), 0,
      'Moving to vacancies must clear the previous view selection')
    await lines.locator('tbody input[type="checkbox"]').first().check()
    const vacancyDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Экспорт CSV' }).click()
    assert.equal((await vacancyDownload).suggestedFilename(), 'vacancies-selected.csv')
    await page.getByRole('button', { name: 'Снять выделение' }).click()
    assert.equal(await lines.locator('tbody input[type="checkbox"]:checked').count(), 0)

    await tabs.getByRole('button', { name: 'Штатное расписание', exact: true }).click()
    await page.getByRole('button', { name: 'Новая версия' }).click()
    const form = page.getByRole('dialog', { name: 'Новая версия штатного расписания' })
    await form.getByLabel('Название версии').fill('QA staffing selection 2049')
    await form.getByLabel('Действует с').fill('2049-01-01')
    await form.getByLabel('Действует по').fill('2049-12-31')
    await form.getByRole('button', { name: 'Создать версию' }).click()
    await page.getByRole('heading', { name: 'QA staffing selection 2049' }).waitFor()
    await tabs.getByRole('button', { name: 'Изменения штатного расписания' }).click()
    const history = page.getByRole('region', { name: 'История изменений штатного расписания' })
    await history.waitFor()
    await history.locator('tbody input[type="checkbox"]').first().check()
    const historyDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Экспорт CSV' }).click()
    assert.equal((await historyDownload).suggestedFilename(), 'staffing-history-selected.csv')
    await page.getByRole('button', { name: 'Снять выделение' }).click()
    assert.equal(await history.locator('tbody input[type="checkbox"]:checked').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})

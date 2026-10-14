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

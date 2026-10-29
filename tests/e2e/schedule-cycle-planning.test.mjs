import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5189'
const schedule = '33333333-3333-4333-8333-333333333333'
const company = '11111111-1111-4111-8111-111111111111'
const fixtureUrl = '/tests/e2e/fixtures/schedule-cycle.html'

async function mount(page, canEditPatterns) {
  let revision = 2
  let days = [{ minutes: 480, shift_code: 'D' }, { minutes: 480, shift_code: 'D' },
    { minutes: 0, shift_code: null }, { minutes: 0, shift_code: null }]
  let lastApply = null
  let lastPatternSave = null
  await page.route('**/api/v1/companies/**/worktime/**', async route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    const method = request.method()
    const json = request.postDataJSON()
    const fulfill = (body, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(body),
    })
    if (pathname.endsWith('/schedule-templates') && method === 'GET') {
      return fulfill({ data: [{ id: schedule, code: 'SHIFT', name: 'Сменный 2/2',
        schedule_type: 'shift', revision }], meta: { can_edit_patterns: canEditPatterns } })
    }
    if (pathname.endsWith('/pattern') && method === 'GET') {
      return fulfill({ data: { id: '44444444-4444-4444-8444-444444444444',
        schedule_id: schedule, version: revision, calendar_policy: 'cycle', days },
        meta: { schedule_revision: revision, can_edit: canEditPatterns } })
    }
    if (pathname.endsWith('/pattern') && method === 'PUT') {
      if (!canEditPatterns) return fulfill({ message: 'Forbidden' }, 403)
      lastPatternSave = json
      revision++
      days = json.days
      return fulfill({ data: { id: '44444444-4444-4444-8444-444444444445',
        schedule_id: schedule, version: revision, calendar_policy: json.calendar_policy,
        days } })
    }
    if (pathname.endsWith('/bulk-plan') && method === 'POST') {
      if (json.employee_ids.includes('22222222-2222-4222-8222-222222222223')
        && !canEditPatterns) return fulfill({ message: 'Not permitted' }, 403)
      if (json.apply) lastApply = json
      return fulfill({
        data: { employee_count: json.employee_ids.length, date_count: 61,
          planned_workdays: 31, planned_rest_days: 30, planned_minutes: 14880,
          missing_calendar: 0, outside_employment: 0, locked_days: 0,
          recorded_actual: 0, existing_plans: 0, new_days: 61 * json.employee_ids.length,
          blocking_count: 0,
          sample: [
            { employee_id: json.employee_ids[0], date: '2026-11-01', planned_minutes: 420, day_kind: 'work' },
            { employee_id: json.employee_ids[0], date: '2026-11-02', planned_minutes: 720, day_kind: 'work' },
            { employee_id: json.employee_ids[0], date: '2026-11-03', planned_minutes: 0, day_kind: 'rest' },
          ],
        },
        meta: { mode: json.apply ? 'applied' : 'preview',
          preview_token: 'a'.repeat(64), pattern_version: revision,
          schedule_revision: revision, can_apply: true },
      })
    }
    return fulfill({ message: 'Unexpected request' }, 404)
  })
  await page.goto(fixtureUrl)
  await page.getByRole('button', { name: 'Открыть планирование' }).click()
  const drawer = page.getByRole('dialog', { name: 'Планирование графиков' })
  await drawer.waitFor()
  await drawer.getByRole('combobox', { name: 'Шаблон графика' }).waitFor()
  return { drawer, lastApply: () => lastApply, lastPatternSave: () => lastPatternSave }
}

test('cycle planning UI: responsive, editable admin pattern, preview then apply', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({
        baseURL, viewport: { width, height: 900 },
      })
      await context.addCookies([{ name: 'XSRF-TOKEN', value: 'synthetic-only',
        url: baseURL }])
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      try {
        const { drawer, lastPatternSave, lastApply } = await mount(page, true)
        await drawer.getByRole('tab', { name: 'Конструктор' }).click()
        await drawer.getByRole('button', { name: 'Сменный 2/2' }).click()
        await drawer.locator('.planner-day input[type=number]').first().fill('7')
        await drawer.getByRole('button', { name: 'Сохранить шаблон' }).click()
        await drawer.getByText('Новая версия шаблона сохранена', { exact: false }).waitFor()
        assert.equal(lastPatternSave().days[0].minutes, 420)
        assert.equal(lastPatternSave().calendar_policy, 'cycle')
        await drawer.getByRole('tab', { name: 'Назначение' }).click()
        await drawer.getByRole('searchbox', { name: 'Поиск сотрудников' }).fill('Разработка')
        await drawer.getByRole('button', { name: 'Выбрать показанных' }).click()
        assert.match(await drawer.locator('.planner-selection').innerText(), /2 выбрано/)
        await drawer.getByRole('searchbox', { name: 'Поиск сотрудников' }).fill('')
        await drawer.getByRole('combobox', { name: 'Подразделение' }).selectOption('Производство')
        await drawer.getByRole('button', { name: 'Выбрать показанных' }).click()
        assert.match(await drawer.locator('.planner-selection').innerText(), /3 выбрано/)
        await drawer.getByRole('textbox', { name: 'С даты' }).count().catch(() => 0)
        await drawer.locator('input[type=date]').first().fill('2026-11-01')
        await drawer.locator('input[type=date]').nth(1).fill('2026-12-31')
        await drawer.getByRole('combobox', { name: 'Начальная фаза цикла' }).selectOption('1')
        await drawer.getByRole('button', { name: 'Проверить' }).click()
        await drawer.getByRole('heading', { name: 'Предварительная проверка' }).waitFor()
        assert.match(await drawer.locator('.planner-totals').innerText(), /31/)
        await drawer.getByText('Подтверждаю назначение', { exact: false }).click()
        await drawer.getByRole('button', { name: 'Назначить график' }).click()
        await drawer.getByText('График назначен:', { exact: false }).waitFor()
        assert.equal(await page.locator('#saved-count').textContent(), '1')
        assert.equal(lastApply().apply, true)
        assert.equal(lastApply().confirm, true)
        assert.equal(lastApply().preview_token, 'a'.repeat(64))
        assert.equal(lastApply().employee_ids.length, 3)
        assert.equal(lastApply().schedule_revision, 3)
        assert.equal(lastApply().cycle_offset, 1)
        assert.equal(lastApply().from, '2026-11-01')
        assert.equal(lastApply().to, '2026-12-31')
        const bounds = await drawer.boundingBox()
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1)
        assert.deepEqual(errors, [])
      } finally { await context.close() }
    }
  } finally { await browser.close() }
})

test('manager cannot edit the global template and receives an authorization error', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL, viewport: { width: 430, height: 820 } })
  try {
    await context.addCookies([{ name: 'XSRF-TOKEN', value: 'synthetic-only', url: baseURL }])
    const page = await context.newPage()
    const { drawer } = await mount(page, false)
    assert.equal(await drawer.getByRole('tab', { name: 'Конструктор' }).count(), 0)
    await drawer.getByRole('button', { name: 'Выбрать показанных' }).click()
    await drawer.locator('input[type=date]').first().fill('2026-11-01')
    await drawer.locator('input[type=date]').nth(1).fill('2026-12-31')
    await drawer.getByRole('button', { name: 'Проверить' }).click()
    await drawer.getByText('Недостаточно прав для выбранных сотрудников.').waitFor()
    assert.equal(await drawer.getByRole('button', { name: 'Назначить график' }).isDisabled(), true)
    assert.equal(await page.locator('#saved-count').textContent(), '0')
  } finally { await context.close(); await browser.close() }
})
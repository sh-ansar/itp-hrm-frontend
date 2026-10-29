import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5207'
const ids = ['22222222-2222-4222-8222-222222222221', '22222222-2222-4222-8222-222222222222']
const fixture = '/tests/e2e/fixtures/worktime-matrix.html'
const dates = ['2026-10-29', '2026-10-30', '2026-11-01', '2026-11-02', '2026-11-03']

function matrixData(url, canEdit) {
  const query = new URL(url).searchParams
  const from = query.get('from') ?? '2026-10-01'
  const to = query.get('to') ?? '2026-10-31'
  const chosenDates = dates.filter(d => d >= from && d <= to)
  const data = chosenDates.map(date => ({
    date, day_type: date === '2026-11-01' ? 'weekend' : 'workday',
    label: null, locked: false,
  }))
  const rows = ids.map((id, i) => ({
    employee_id: id, personnel_number: 'MTR-00' + (i + 1),
    full_name: i === 0 ? 'Иванов Иван' : 'Петров Пётр',
    department_name: i === 0 ? 'Разработка' : 'Бухгалтерия',
    department_id: i === 0 ? '33333333-3333-4333-8333-333333333331' : '33333333-3333-4333-8333-333333333332',
    position_name: 'Специалист', schedule_name: i === 0 ? 'Офисный 5/2' : 'Сменный',
    summary: { planned_minutes: 1440, worked_minutes: i === 0 ? 450 : null,
      missing_days: 2, recorded_days: i === 0 ? 1 : 0 },
    days: chosenDates.map(date => {
      const weekend = date === '2026-11-01'
      const future = date === '2026-11-03'
      const recorded = i === 0 && date === '2026-10-29'
      return { date, planned_minutes: weekend ? 0 : 480,
        worked_minutes: recorded ? 450 : null,
        absence_minutes: recorded ? 0 : null, overtime_minutes: recorded ? 0 : null,
        shift_code: null, revision: recorded ? 1 : null,
        state: recorded ? 'recorded' : weekend ? 'rest' : future ? 'future' : 'missing',
        locked: false, editable: !future && !weekend && canEdit }
    }),
  }))
  let visible = rows
  if (query.get('department_id') === '33333333-3333-4333-8333-333333333331') visible = rows.slice(0, 1)
  if (query.get('status') === 'recorded') visible = rows.slice(0, 1)
  if ((query.get('q') ?? '').includes('MTR-002')) visible = rows.slice(1, 2)
  return { data: { dates: data, rows: visible },
    meta: { from, to, group_by: query.get('group_by') || 'department', can_edit: canEdit,
      calendar_complete: true, current_page: Number(query.get('page') || '1'),
      last_page: 1, per_page: Number(query.get('per_page') || '30'), total: visible.length,
      manager_scope_policy: 'single_assignment_full_period',
      filters: {
        departments: [
          { id: '33333333-3333-4333-8333-333333333331', name: 'Разработка' },
          { id: '33333333-3333-4333-8333-333333333332', name: 'Бухгалтерия' },
        ],
        schedules: [{ id: '44444444-4444-4444-8444-444444444444', name: 'Офисный 5/2' }],
      },
    },
  }
}

async function setup(page, canEdit = true) {
  const bulkCalls = []
  const queries = []
  await page.route('**/api/v1/companies/**/worktime/matrix**', async route => {
    const request = route.request()
    const url = request.url()
    if (url.endsWith('/bulk-edit')) {
      const payload = request.postDataJSON()
      bulkCalls.push(payload)
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        data: { candidate_count: payload.cells.length, new_entries: payload.cells.length,
          updates: 0, skipped_recorded: 0, skipped_leave: 0, skipped_absence: 0,
          skipped_nonworking: 0, skipped_future: 0, missing_calendar: 0,
          outside_employment: 0, ambiguous_employment: 0, unknown_shift: 0,
          locked_cells: 0, existing_requires_overwrite: 0, protected_actual: 0, blocking_count: 0 },
        meta: { mode: payload.apply ? 'applied' : 'preview',
          from: payload.cells[0].date, to: payload.cells.at(-1).date,
          can_apply: true, preview_token: 'a'.repeat(64) },
      }) })
    }
    queries.push(url)
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(matrixData(url, canEdit)) })
  })
  await page.goto(fixture)
  await page.getByRole('region', { name: 'Табель по сотрудникам и дням' }).waitFor()
  return { bulkCalls, queries }
}

test('matrix: responsive cross-month sparse multi-selection and explicit preview/apply', async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ baseURL, viewport: { width, height: 880 } })
      await context.addCookies([{ name: 'XSRF-TOKEN', value: 'synthetic-only', url: baseURL }])
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      try {
        const { bulkCalls } = await setup(page)
        await page.getByRole('textbox', { name: 'С даты' }).count().catch(() => 0)
        await page.locator('input[type=date]').first().fill('2026-10-29')
        await page.locator('input[type=date]').nth(1).fill('2026-11-03')
        await page.getByRole('button', { name: 'Показать' }).click()
        await page.locator('[data-employee-id="' + ids[0] + '"] [data-date="2026-11-02"]').waitFor()
        const rowOne = page.locator('[data-employee-id="' + ids[0] + '"]')
        const rowTwo = page.locator('[data-employee-id="' + ids[1] + '"]')
        await rowOne.locator('[data-date="2026-10-29"] button').click()
        await rowTwo.locator('[data-date="2026-10-30"] button').click()
        assert.match(await page.locator('.matrix-selection-tools').innerText(), /Выделено 2 ячеек/)
        assert.equal(await rowOne.locator('[data-date="2026-11-03"] button').isDisabled(), true)
        assert.equal(await rowOne.locator('[data-date="2026-11-01"] button').isDisabled(), true)
        await page.getByRole('combobox', { name: 'Действие' }).selectOption('set_worked')
        await page.getByRole('spinbutton', { name: 'Отработано, часов' }).fill('7')
        await page.getByText('Разрешить изменение существующих явок', { exact: false }).click()
        await page.getByRole('button', { name: 'Проверить изменения' }).click()
        await page.getByRole('heading', { name: 'Предпросмотр операции' }).waitFor()
        assert.equal(bulkCalls.length, 1)
        assert.equal(bulkCalls[0].operation, 'set_worked')
        assert.equal(bulkCalls[0].worked_minutes, 420)
        assert.equal(bulkCalls[0].overwrite_existing, true)
        assert.deepEqual(bulkCalls[0].cells, [
          { employee_id: ids[0], date: '2026-10-29' },
          { employee_id: ids[1], date: '2026-10-30' },
        ])
        await page.getByText('Подтверждаю массовое изменение', { exact: false }).click()
        await page.getByRole('button', { name: 'Сохранить в табель' }).click()
        await page.getByText('Сохранено:', { exact: false }).waitFor()
        assert.equal(await page.locator('#saved').textContent(), '1')
        assert.equal(bulkCalls.length, 2)
        assert.equal(bulkCalls[1].apply, true)
        assert.equal(bulkCalls[1].confirm, true)
        assert.equal(bulkCalls[1].preview_token, 'a'.repeat(64))
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
        assert.ok(overflow <= 1, 'horizontal scroll stays inside matrix region, overflow=' + overflow)
        assert.deepEqual(errors, [])
      } finally { await context.close() }
    }
  } finally { await browser.close() }
})

test('matrix: server filters, grouping and read-only manager mode', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ baseURL, viewport: { width: 430, height: 820 } })
  try {
    const page = await context.newPage()
    const { queries } = await setup(page, false)
    assert.equal(await page.locator('.matrix-action-panel').count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Выбрать незаполненные' }).count(), 0)
    await page.getByRole('searchbox', { name: 'Поиск по ФИО или табельному номеру' }).fill('MTR-002')
    await page.getByRole('combobox', { name: 'Группировать' }).selectOption('none')
    await page.getByRole('button', { name: 'Показать' }).click()
    await page.locator('[data-employee-id="' + ids[1] + '"]').waitFor()
    assert.equal(await page.locator('[data-employee-id="' + ids[0] + '"]').count(), 0)
    const latest = new URL(queries.at(-1))
    assert.equal(latest.searchParams.get('q'), 'MTR-002')
    assert.equal(latest.searchParams.get('group_by'), 'none')
  } finally { await context.close(); await browser.close() }
})

import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

const baseURL = 'http://127.0.0.1:5173'
const routes = [
  ['/', 'Главная'],
  ['/employees', 'Реестр сотрудников'],
  ['/employees-development', 'Кадровый резерв и обучение'],
  ['/organization', 'Организационная структура'],
  ['/staffing', 'Штатное расписание'],
  ['/staffing?view=vacant', 'Вакантные позиции'],
  ['/staffing?view=changes', 'Изменения штатного расписания'],
  ['/personnel-actions', 'Кадровые процессы'],
  ['/documents', 'Документы и приказы'],
  ['/directories', 'Справочники'],
  ['/learning', 'Обучение'],
  ['/reserve', 'Кадровый резерв'],
  ['/timesheets', 'Графики и табель'],
  ['/leaves', 'Отпуска'],
  ['/reports', 'Отчёты и аналитика'],
  ['/roles', 'Назначение ролей'],
  ['/settings', 'Настройки'],
]

test('the actual Vercel-style demo opens every existing workspace on four viewports', async () => {
  for (const width of [375, 768, 1280, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const failures = []
    page.on('pageerror', error => failures.push(error.message))
    try {
      for (const [route, heading] of routes) {
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        const title = page.locator('main#main-content h1').first()
        await title.waitFor({ timeout: 12_000 })
        assert.ok((await title.innerText()).includes(heading), `Unexpected title on ${route} at ${width}px`)
        await page.waitForTimeout(150)
        const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)
        assert.ok(overflow <= 1, `Document overflow on ${route} at ${width}px by ${overflow}px`)
      }
      assert.deepEqual(failures, [], `JavaScript errors in the demo at ${width}px`)
    } finally {
      await context.close()
    }
  }
})

test('department create, rename, reload and delete are real demo operations', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const original = 'QA Demo Subdivision 26014'
  const renamed = 'QA Demo Subdivision Updated 26014'
  try {
    await page.goto('/organization')
    await page.getByRole('button', { name: 'Добавить подразделение' }).click()
    const addDialog = page.getByRole('dialog', { name: 'Новое подразделение' })
    await addDialog.getByLabel('Название подразделения').fill(original)
    await addDialog.getByRole('button', { name: 'Добавить подразделение' }).click()
    await addDialog.waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Таблица', exact: true }).click()
    const row = page.getByRole('table', { name: 'Подразделения компании' }).getByRole('row').filter({ hasText: original })
    await row.waitFor()
    await row.getByRole('button', { name: `Изменить ${original}` }).click()
    const editDialog = page.getByRole('dialog', { name: 'Изменить подразделение' })
    await editDialog.getByLabel('Название подразделения').fill(renamed)
    await editDialog.getByRole('button', { name: 'Сохранить изменения' }).click()
    await editDialog.waitFor({ state: 'hidden' })

    await page.reload()
    await page.getByRole('button', { name: 'Таблица', exact: true }).click()
    const changed = page.getByRole('table', { name: 'Подразделения компании' }).getByRole('row').filter({ hasText: renamed })
    await changed.waitFor()
    await changed.getByRole('button', { name: `Удалить ${renamed}` }).click()
    const deleteDialog = page.getByRole('dialog', { name: 'Удалить подразделение' })
    await deleteDialog.getByRole('button', { name: 'Удалить', exact: true }).click()
    await deleteDialog.waitFor({ state: 'hidden' })
    await changed.waitFor({ state: 'detached' })
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})

test('position create, rename, reload and delete survive demo navigation', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()
  const failures = []
  page.on('pageerror', error => failures.push(error.message))
  const original = 'QA Demo Position 26014'
  const renamed = 'QA Demo Position Updated 26014'
  try {
    await page.goto('/directories')
    await page.getByRole('button', { name: 'Добавить должность' }).click()
    const addDialog = page.getByRole('dialog', { name: 'Новая должность' })
    await addDialog.getByLabel('Название должности').fill(original)
    await addDialog.getByRole('button', { name: 'Добавить должность' }).click()
    await addDialog.waitFor({ state: 'hidden' })

    let row = page.getByRole('row').filter({ hasText: original })
    await row.waitFor()
    await row.getByRole('button', { name: `Изменить должность ${original}` }).click()
    const editDialog = page.getByRole('dialog', { name: 'Изменить должность' })
    await editDialog.getByLabel('Название должности').fill(renamed)
    await editDialog.getByRole('button', { name: 'Сохранить изменения' }).click()
    await editDialog.waitFor({ state: 'hidden' })

    await page.reload()
    row = page.getByRole('row').filter({ hasText: renamed })
    await row.waitFor()
    await row.getByRole('button', { name: `Удалить должность ${renamed}` }).click()
    const deleteDialog = page.getByRole('dialog', { name: 'Удалить должность' })
    await deleteDialog.getByRole('button', { name: 'Удалить', exact: true }).click()
    await deleteDialog.waitFor({ state: 'hidden' })
    await row.waitFor({ state: 'detached' })
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('directory writes reject stale revisions, cycles and deletion of referenced records', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const { mockApiRequest: request } = await import('/src/mocks/mockApi.ts')
      const company = '11111111-1111-4111-8111-111111111111'
      const base = `/companies/${company}/departments`
      const post = (name, parent_id = null) =>
        request(base, { method: 'POST', body: JSON.stringify({ name, parent_id }) })
      const update = (id, name, parent_id, revision) =>
        request(`${base}/${id}`, { method: 'PUT', body: JSON.stringify({ name, parent_id, revision }) })
      const remove = (id, revision) =>
        request(`${base}/${id}`, { method: 'DELETE', body: JSON.stringify({ revision }) })
      const expectReject = async (action) => {
        try { await action(); return false } catch { return true }
      }
      const parent = (await post('QA test parent')).data
      const child = (await post('QA test child', parent.id)).data
      const childDeleteBlocked = await expectReject(() => remove(parent.id, parent.revision))
      const cycleBlocked = await expectReject(() => update(parent.id, parent.name, child.id, parent.revision))
      const renamed = (await update(child.id, 'QA test child renamed', parent.id, child.revision)).data
      const staleBlocked = await expectReject(() => update(child.id, 'Wrong rewrite', parent.id, child.revision))
      await remove(child.id, renamed.revision)
      await remove(parent.id, parent.revision)
      return { childDeleteBlocked, cycleBlocked, staleBlocked }
    })
    assert.deepEqual(result, { childDeleteBlocked: true, cycleBlocked: true, staleBlocked: true })
  } finally {
    await context.close()
  }
})

test('employee card creates and edits training that appears in the shared company register', async () => {
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 850 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const topic = 'QA обучение работающее в карточке'
  const renamed = 'QA обучение обновлено из карточки'
  try {
    await page.goto('/employees/11111111-1111-4111-8111-111111111111/00000000-0000-4000-8000-000000001000?tab=development')
    await page.getByRole('navigation', { name: 'Разделы карточки сотрудника' })
      .getByRole('button', { name: 'Кадровый резерв и обучение' }).click()
    await page.getByRole('button', { name: 'Добавить сведения' }).click()
    const creator = page.getByRole('dialog', { name: 'Добавить сведения' })
    await creator.getByRole('group', { name: 'Раздел карточки' })
      .getByRole('button', { name: 'Обучение' }).click()
    await creator.getByLabel('Вид обучения').fill('seminar')
    await creator.getByLabel('Способ обучения').selectOption('remote')
    await creator.getByLabel('Тема').fill(topic)
    await creator.getByLabel('Дата начала').fill('2026-10-14')
    await creator.getByRole('button', { name: 'Сохранить запись' }).click()
    await creator.waitFor({ state: 'hidden' })

    const table = page.getByRole('table', { name: 'Обучение сотрудника' })
    const created = table.getByRole('row').filter({ hasText: topic })
    await created.waitFor()
    await created.getByRole('button', { name: 'Изменить' }).click()
    const editor = page.getByRole('dialog', { name: 'Изменить сведения' })
    await editor.getByLabel('Тема').fill(renamed)
    await editor.getByRole('button', { name: 'Сохранить изменения' }).click()
    await editor.waitFor({ state: 'hidden' })
    await table.getByRole('row').filter({ hasText: renamed }).waitFor()

    // Navigate within Vue's router: a full-page reload intentionally resets
    // mock-only HR data, which is never stored as sensitive browser storage.
    await page.evaluate(async () => { const { router } = await import('/src/router/index.ts'); await router.push('/learning') })
    await page.getByRole('heading', { name: 'Обучение', level: 1 }).waitFor()
    // Both desktop and mobile layouts share this content; assert the visible mobile card.
    await page.locator('.development-mobile').getByText(renamed, { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
  } finally {
    await context.close()
  }
})

test('employee profile and assignments save real demo data and reject stale writes', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const { mockApiRequest: request } = await import('/src/mocks/mockApi.ts')
      const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
      const company = '11111111-1111-4111-8111-111111111111'
      const base = `/companies/${company}/employees/${id(1033)}`
      const existing = await request(base)
      const created = (await request(base + '/assignments', {
        method: 'POST', body: JSON.stringify({
          department_id: id(105), position_id: id(305), valid_from: '2026-10-01',
          valid_to: null, basis_reference: 'QA-ASSIGN',
        }),
      })).data
      const afterCreate = await request(base)
      const oldRevision = created.revision
      const transition = (await request(base + '/assignments/' + created.id + '/transition', {
        method: 'POST', body: JSON.stringify({
          revision: oldRevision, department_id: id(106), position_id: id(306),
          valid_from: '2026-11-01', valid_to: null, basis_reference: 'QA-TRANSFER',
        }),
      })).data
      const afterTransition = await request(base)
      const expectRejected = async action => {
        try { await action(); return false } catch { return true }
      }
      const staleRejected = await expectRejected(() => request(base + '/assignments/' + created.id, {
        method: 'PUT', body: JSON.stringify({
          revision: oldRevision, department_id: id(107), position_id: id(307),
          valid_from: '2026-10-01', valid_to: '2026-10-31',
        }),
      }))
      const overlappingRejected = await expectRejected(() => request(base + '/assignments', {
        method: 'POST', body: JSON.stringify({
          department_id: id(107), position_id: id(307),
          valid_from: '2026-11-02', valid_to: null,
        }),
      }))
      const otherCompanyRejected = await expectRejected(() =>
        request('/companies/22222222-2222-4222-8222-222222222222/employees/' + id(1033)))
      const unsupportedRejected = await expectRejected(() =>
        request(`/companies/${company}/not-an-existing-action`, { method: 'POST' }))
      const trainBase = `/companies/${company}/employees/${id(1000)}/profile/training`
      const entry = (await request(trainBase, { method: 'POST', body: JSON.stringify({
        training_type: 'seminar', training_mode: 'remote', topic: 'QA initial',
        started_on: '2026-10-01', ended_on: null,
      }) })).data
      const changed = (await request(trainBase + '/' + entry.id, {
        method: 'PUT', body: JSON.stringify({
          revision: entry.revision, training_type: 'seminar', training_mode: 'remote',
          topic: 'QA changed', started_on: '2026-10-01', ended_on: null,
        }),
      })).data
      const trainingStaleRejected = await expectRejected(() =>
        request(trainBase + '/' + entry.id, { method: 'PUT', body: JSON.stringify({
          revision: entry.revision, topic: 'QA stale', training_type: 'seminar',
          training_mode: 'remote', started_on: '2026-10-01',
        }) }))
      const profile = await request(`/companies/${company}/employees/${id(1000)}`)
      return {
        initiallyUnassigned: existing.assignments.length === 0,
        createdVisible: afterCreate.assignments.some(x => x.id === created.id),
        oldClosed: afterTransition.assignments.find(x => x.id === created.id)?.valid_to === '2026-10-31',
        newVisible: afterTransition.assignments.some(x => x.id === transition.new_assignment.id),
        employeeMoved: afterTransition.data.current_department_id === id(106),
        staleRejected, overlappingRejected, otherCompanyRejected, unsupportedRejected,
        trainingStaleRejected,
        trainingUpdated: changed.revision === 2 && profile.training.some(x => x.id === entry.id && x.topic === 'QA changed'),
      }
    })
    assert.deepEqual(result, {
      initiallyUnassigned: true, createdVisible: true, oldClosed: true, newVisible: true,
      employeeMoved: true, staleRejected: true, overlappingRejected: true,
      otherCompanyRejected: true, unsupportedRejected: true,
      trainingStaleRejected: true, trainingUpdated: true,
    })
  } finally {
    await context.close()
  }
})

test('transfer, termination and rehire are reflected in the employee assignment history', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const { mockApiRequest: request } = await import('/src/mocks/mockApi.ts')
      const employee = '00000000-0000-4000-8000-000000001001'
      const company = '11111111-1111-4111-8111-111111111111'
      const base = `/companies/${company}/employees/${employee}`
      const post = (operation, effective_on, extra = {}) =>
        request(`${base}/personnel-actions/${operation}`, {
          method: 'POST', body: JSON.stringify({ effective_on, basis_reference: 'QA-2026', ...extra }),
        })
      const target = {
        department_id: '00000000-0000-4000-8000-000000000105',
        position_id: '00000000-0000-4000-8000-000000000306',
      }
      await post('transfer', '2026-10-01', target)
      const afterTransfer = await request(base)
      await post('terminate', '2026-10-10')
      const afterTermination = await request(base)
      await post('hire', '2026-10-15', target)
      const afterRehire = await request(base)
      return {
        moved: afterTransfer.data.current_department_id === target.department_id,
        closedOnTermination: afterTermination.assignments.every(x => x.valid_to !== null),
        archived: afterTermination.data.employment_status === 'archived',
        activeAgain: afterRehire.data.employment_status === 'active',
        appointments: afterRehire.assignments.length,
        lastOpen: afterRehire.assignments.filter(x => x.valid_to === null).length,
      }
    })
    assert.deepEqual(result, {
      moved: true, closedOnTermination: true, archived: true,
      activeAgain: true, appointments: 3, lastOpen: 1,
    })
  } finally {
    await context.close()
  }
})

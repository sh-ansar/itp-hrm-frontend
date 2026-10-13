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

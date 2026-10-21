import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('primary ZIP directory cards, nested tariff tree, register mode and mobile overflow', async () => {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto('/directories')
      await page.getByRole('heading', { name: 'Справочники', level: 1 }).waitFor()
      const expected = [
        'Отпуска и лимиты',
        'Условия труда, надбавки и компенсации',
        'Тарифы и начисления',
        'Развитие и подбор кадров',
        'Документы и основания',
      ]
      for (const label of expected)
        assert.equal(await page.locator('.view-tabs').getByRole('button', { name: label, exact: true }).count(), 1)
      assert.equal(await page.getByRole('link', { name: 'Справочник должностей' }).count(), 1)

      const cards = page.locator('.directory-card-columns')
      await cards.waitFor()
      assert.equal(await cards.locator('.directory-accordion-card').count(), 7)
      const columns = await cards.locator('.directory-card-column').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect()
        return { x: Math.round(rect.x), y: Math.round(rect.y) }
      }))
      assert.equal(columns.length, 2)
      if (width === 1440) assert.notEqual(columns[0].x, columns[1].x, 'ZIP cards use two columns at desktop width')
      else assert.equal(columns[0].x, columns[1].x, 'ZIP cards stack without horizontal page overflow')

      const trigger = cards.getByRole('button', { name: /Виды тарифов/ })
      await trigger.waitFor()
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true')
      const tree = page.getByRole('tree', { name: 'Иерархия тарифов' })
      await tree.waitFor()
      assert.equal(await tree.getByRole('treeitem').count(), 11, 'ZIP tiers start expanded from API parent links')
      await tree.getByRole('button', { name: 'Свернуть: Навалочные грузы' }).click()
      assert.equal(await tree.getByRole('treeitem').count(), 7)
      await tree.getByRole('button', { name: 'Раскрыть: Навалочные грузы' }).click()
      assert.equal(await tree.getByRole('treeitem').count(), 11)
      await tree.getByRole('button', { name: 'Свернуть: По грузам' }).click()
      assert.equal(await tree.getByRole('treeitem').count(), 4, 'Root collapse hides all nested rows')
      const search = cards.getByRole('searchbox', { name: 'Поиск: Виды тарифов' })
      await search.fill('Кварцевый песок')
      await tree.getByText('Кварцевый песок навалом РТК №001').waitFor()
      await search.fill('')
      await tree.getByRole('button', { name: 'Раскрыть: По грузам' }).click()
      assert.equal(await tree.getByRole('treeitem').count(), 11)

      const otherGroup = cards.getByRole('button', { name: /Единицы расчёта/ })
      await otherGroup.click()
      assert.equal(await otherGroup.getAttribute('aria-expanded'), 'true')
      assert.equal(await tree.count(), 0, 'Only the expanded reference card shows its content')
      await otherGroup.click()
      assert.equal(await otherGroup.getAttribute('aria-expanded'), 'false', 'Expanded card can be collapsed')
      await page.locator('.view-tabs').getByRole('button', { name: 'Отпуска и лимиты' }).click()
      assert.equal(await cards.locator('.directory-accordion-card').count(), 4)
      await cards.getByText('Ежегодный оплачиваемый отпуск').waitFor()

      await page.getByRole('button', { name: 'Реестр', exact: true }).click()
      const table = page.getByRole('table', { name: 'Виды отпусков' })
      await table.waitFor()
      assert.equal(await page.locator('.directory-index').count(), 1, 'Alternative registry mode keeps shared table')
      const scroll = page.locator('.directory-table-scroll').first()
      const styles = await scroll.evaluate(el => ({
        overflowX: getComputedStyle(el).overflowX,
        overflowY: getComputedStyle(el).overflowY,
      }))
      assert.equal(styles.overflowX, 'auto')
      assert.equal(styles.overflowY, 'hidden')
      await page.getByRole('button', { name: 'Карточки', exact: true }).click()
      await cards.waitFor()

      const layout = await page.evaluate(() => ({
        viewport: innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      assert.ok(layout.html <= width + 1 && layout.body <= width + 1,
        'Directory layout exceeds viewport ' + width + ': ' + JSON.stringify(layout))
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
})

test('demo tariff hierarchy refuses loops and preserves independent company data', async () => {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  try {
    await page.goto('/')
    const result = await page.evaluate(async () => {
      const { mockApiRequest: request } = await import('/src/mocks/mockApi.ts')
      const company = '11111111-1111-4111-8111-111111111111'
      const base = '/companies/' + company + '/directories/tariff-types'
      const expectReject = async fn => { try { await fn(); return false } catch { return true } }
      const post = async (code, parentId) => (await request(base, {
        method: 'POST',
        body: JSON.stringify({ code, name: code, parent_id: parentId, status: 'active' }),
      })).data
      const parent = await post('QA-PARENT-2049', null)
      const child = await post('QA-CHILD-2049', parent.id)
      const parentHasChild = (await request(base)).data.some(row => row.id === child.id && row.parent_id === parent.id)
      const refuseDelete = await expectReject(() => request(base + '/' + parent.id, {
        method: 'DELETE', body: JSON.stringify({ revision: parent.revision }),
      }))
      const refuseCycle = await expectReject(() => request(base + '/' + parent.id, {
        method: 'PUT', body: JSON.stringify({ code: parent.code, name: parent.name, status: 'active',
          parent_id: child.id, revision: parent.revision }),
      }))
      const refuseUnknown = await expectReject(() => post('QA-UNKNOWN-2049', '00000000-0000-4000-8000-000000000999'))
      return { parentHasChild, refuseDelete, refuseCycle, refuseUnknown }
    })
    assert.deepEqual(result, { parentHasChild: true, refuseDelete: true, refuseCycle: true, refuseUnknown: true })
  } finally {
    await context.close()
  }
})

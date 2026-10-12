import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

let browser
before(async () => { browser = await chromium.launch({ headless: true }) })
after(async () => { await browser?.close() })

test('form field announces validation and updates model', async () => {
  const page = await browser.newPage()
  try {
    await page.goto('http://127.0.0.1:5173/tests/e2e/fixtures/components.html')
    const field = page.getByRole('textbox', { name: 'Тестовое поле' })
    await field.fill('invalid')
    assert.equal(await field.getAttribute('aria-invalid'), 'true')
    assert.equal(await page.getByText('Неверное значение').count(), 1)
    assert.equal(await page.locator('#field-value').textContent(), 'invalid')
    await field.fill('valid')
    assert.equal(await field.getAttribute('aria-invalid'), 'false')
    assert.equal(await page.getByText('Неверное значение').count(), 0)
  } finally { await page.close() }
})

test('modal dialog has a name, supports Escape and restores interaction', async () => {
  const page = await browser.newPage()
  try {
    await page.goto('http://127.0.0.1:5173/tests/e2e/fixtures/components.html')
    await page.getByRole('button', { name: 'Открыть диалог' }).click()
    const dialog = page.getByRole('dialog', { name: 'Проверка диалога' })
    await dialog.waitFor()
    assert.equal(await dialog.isVisible(), true)
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Открыть диалог' }).click()
    assert.equal(await dialog.isVisible(), true)
    await dialog.getByRole('button', { name: 'Закрыть диалог' }).click()
    await dialog.waitFor({ state: 'hidden' })
  } finally { await page.close() }
})

test('table exposes semantic headers and stable row contents', async () => {
  const page = await browser.newPage()
  try {
    await page.goto('http://127.0.0.1:5173/tests/e2e/fixtures/components.html')
    assert.equal(await page.getByRole('table', { name: 'Тестовый реестр' }).count(), 1)
    assert.equal(await page.getByRole('columnheader', { name: 'Имя' }).count(), 1)
    assert.equal(await page.getByRole('cell', { name: 'Тестовая запись' }).count(), 1)
  } finally { await page.close() }
})

test('shared field, table and dialog work at mobile, tablet and desktop widths', async () => {
  for (const width of [375, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } })
    try {
      await page.goto('http://127.0.0.1:5173/tests/e2e/fixtures/components.html')
      const field = page.getByRole('textbox', { name: 'Тестовое поле' })
      await field.fill('responsive')
      assert.equal(await page.locator('#field-value').textContent(), 'responsive')
      const fieldBounds = await field.boundingBox()
      assert.ok(fieldBounds && fieldBounds.x >= 0 && fieldBounds.x + fieldBounds.width <= width + 1,
        'field must fit viewport at ' + width)
      const region = page.getByRole('region', { name: 'Тестовый реестр' })
      assert.equal(await region.count(), 1)
      const regionBounds = await region.boundingBox()
      assert.ok(regionBounds && regionBounds.x >= 0 && regionBounds.x + regionBounds.width <= width + 1,
        'table scroll container must fit viewport at ' + width)
      await page.getByRole('button', { name: 'Открыть диалог' }).click()
      const dialog = page.getByRole('dialog', { name: 'Проверка диалога' })
      await dialog.waitFor()
      const dialogBounds = await dialog.boundingBox()
      assert.ok(dialogBounds && dialogBounds.x >= 0 && dialogBounds.x + dialogBounds.width <= width + 1,
        'modal must fit viewport at ' + width)
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
    } finally {
      await page.close()
    }
  }
})

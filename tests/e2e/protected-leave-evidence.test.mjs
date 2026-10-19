import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.HRM_E2E_BASE_URL || 'http://127.0.0.1:5173'
const company = '11111111-1111-4111-8111-111111111111'
const employee = '77777777-7777-4777-8777-777777777777'
const base = '/api/v1/companies/' + company

async function login(browser, actor, width) {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 980 } })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Электронная почта').fill(
    actor === 'admin' ? 'synthetic-bonus-approver@example.test'
      : actor === 'manager' ? 'synthetic-manager@example.test'
        : 'synthetic-employee@example.test')
  await page.getByLabel('Пароль').fill(
    actor === 'admin' ? 'SyntheticBonusApproval-Only!2026' : 'SyntheticRole-Only!2026')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await page.waitForURL(url => !url.pathname.endsWith('/login'))
  return { context, page }
}
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const token = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))?.slice(11)
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json',
        ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return {
      status: response.status,
      body: response.headers.get('content-type')?.includes('json') ? await response.json() : null,
    }
  }, { path, method, body })
}

test('employee uploads private protected PDF, HR verifies, approval requires evidence and access stays private', async () => {
  const browser = await chromium.launch({
    headless: true, ...(process.env.HRM_CHROME_PATH ? { executablePath: process.env.HRM_CHROME_PATH } : {}),
  })
  try {
    const admin = await login(browser, 'admin', 1440)
    const staff = await login(browser, 'employee', 375)
    // Link the employee through actual administration UI.
    await admin.page.goto('/roles')
    const user = admin.page.getByRole('row').filter({ hasText: 'synthetic-employee@example.test' })
    await user.getByRole('button').click()
    await admin.page.getByRole('menuitem', { name: 'Кабинет сотрудника', exact: true }).click()
    await admin.page.getByRole('combobox', { name: 'Кадровая запись', exact: true }).selectOption(employee)
    await admin.page.getByRole('button', { name: 'Сохранить связь', exact: true }).click()
    await admin.page.getByText('Связь учётной записи сохранена.', { exact: true }).waitFor()
    const type = await api(admin.page, base + '/leave-types', 'POST', {
      code: 'protected_evidence_chromium', name: 'Protected medical E2E',
      annual_days: null, balance_method: 'calendar_days', category: 'medical',
    })
    assert.equal(type.status, 201)
    await staff.page.reload()
    await staff.page.getByRole('button', { name: 'Подать заявку', exact: true }).click()
    await staff.page.getByRole('combobox', { name: 'Вид отпуска', exact: true }).selectOption(type.body.data.id)
    await staff.page.getByLabel('Начало отпуска').fill('2026-11-15')
    await staff.page.getByLabel('Окончание отпуска').fill('2026-11-17')
    await staff.page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click()
    await staff.page.getByText('Protected medical E2E', { exact: true }).waitFor()

    const own = await api(staff.page, base + '/me/workspace')
    const request = own.body.data.requests.find(r => r.leave_type_id === type.body.data.id)
    assert.ok(request)
    assert.equal(request.category, 'medical')
    const fileUrl = base + '/leave-requests/' + request.id + '/evidence/file'
    assert.equal((await api(staff.page, base + '/leave-requests')).status, 403)

    const panel = staff.page.locator('.protected-evidence').filter({ hasText: 'Подтверждающий документ' })
    await panel.getByText('Документ пока не прикреплён', { exact: true }).waitFor()
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
      + '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n')
    await panel.locator('input[type="file"]').setInputFiles({
      name: 'private-e2e.pdf', mimeType: 'application/pdf', buffer: pdf,
    })
    const observed = []
    const clientDiagnostics = []
    staff.page.on('console', message => {
      if (message.text().startsWith('HRM_PROTECTED_')) clientDiagnostics.push(message.text())
    })
    staff.page.on('request', req => {
      if (req.url().endsWith('/evidence/file') && req.method() === 'POST') observed.push(req.url())
    })
    const selectedInfo = await panel.locator('input[type="file"]').evaluate(input => ({
      type: input.files?.[0]?.type, size: input.files?.[0]?.size,
      csrfPresent: document.cookie.split('; ').some(pair => pair.startsWith('XSRF-TOKEN=')),
    }))
    await panel.getByRole('button', { name: 'Прикрепить PDF', exact: true }).click()
    await staff.page.waitForTimeout(550)
    const uiState = await panel.innerText()
    console.log('E2E_PROTECTED_UPLOAD_STAGE', JSON.stringify({
      selectedInfo, requestsSent: observed.length,
      text: uiState.slice(0, 450), clientDiagnostics,
    }))
    if (!uiState.includes('Ожидает проверки HR')) {
      const latest = await api(staff.page, base + '/me/workspace')
      const item = latest.body.data.requests.find(row => row.id === request.id)
      throw new Error('Evidence did not reach pending: ' + JSON.stringify({
        selectedInfo, postCount: observed.length,
        evidenceStatus: item?.evidence_status, ui: uiState.slice(0, 450), clientDiagnostics,
      }))
    }
    const afterUpload = await api(staff.page, base + '/me/workspace')
    assert.equal(afterUpload.body.data.requests[0].evidence_status, 'pending')
    assert.equal(afterUpload.body.data.requests[0].evidence_revision, 1)
    const ownDownload = await staff.page.evaluate(async path => {
      const response = await fetch(path, { credentials: 'same-origin' })
      return { status: response.status, contentType: response.headers.get('content-type') }
    }, fileUrl)
    assert.equal(ownDownload.status, 200)
    assert.equal(ownDownload.contentType, 'application/pdf')

    const manager = await login(browser, 'manager', 768)
    assert.equal((await api(manager.page, fileUrl)).status, 404)
    await manager.context.close()

    await staff.page.getByRole('button', { name: 'Отправить на согласование', exact: true }).click()
    await staff.page.getByText(/На согласовании/).waitFor()
    assert.equal((await api(admin.page, base + '/leave-requests/' + request.id + '/decision',
      'POST', { revision: 2, decision: 'approved' })).status, 422)

    await admin.page.goto('/leaves')
    await admin.page.getByRole('button', { name: 'Управление отпусками', exact: true }).click()
    const record = admin.page.locator('.leave-management-row').filter({ hasText: 'Protected medical E2E' })
    await record.getByText('Ожидает проверки HR', { exact: true }).waitFor()
    await record.getByRole('button', { name: 'Подтвердить проверку', exact: true }).click()
    await record.getByText('Проверен кадровой службой', { exact: true }).waitFor()
    admin.page.once('dialog', dialog => dialog.accept())
    await record.getByRole('button', { name: 'Утвердить', exact: true }).click()
    await staff.page.reload()
    await staff.page.getByText(/Утверждено/).waitFor()
    const final = await api(staff.page, base + '/me/workspace')
    assert.equal(final.body.data.requests[0].status, 'approved')
    assert.equal(final.body.data.requests[0].evidence_status, 'verified')
    assert.equal(final.body.data.leaves.length, 1)
    for (const width of [1440, 768, 375]) {
      await staff.page.setViewportSize({ width, height: 980 })
      assert.ok(await staff.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    }
    await admin.context.close()
    await staff.context.close()
  } finally {
    await browser.close()
  }
})

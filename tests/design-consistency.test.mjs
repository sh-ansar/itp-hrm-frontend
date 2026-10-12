import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const root = new URL('../src/', import.meta.url)
const tokens = readFileSync(new URL('styles/tokens.css', root), 'utf8')
const requiredTokens = ['--color-primary', '--color-text', '--color-surface', '--color-stroke', '--color-focus', '--control-height']
const controls = ['BaseButton.vue', 'BaseFormField.vue', 'BaseDialog.vue', 'BaseNotice.vue', 'BaseDataTable.vue', 'BaseEmptyState.vue', 'BaseSelectField.vue', 'BasePagination.vue', 'BasePageHeading.vue']

test('BNT-derived shared tokens remain available', () => {
  for (const name of requiredTokens) assert.match(tokens, new RegExp(name + ':'))
  assert.match(tokens, /Golos Text/)
})

test('reusable controls are present and use shared semantic tokens', () => {
  for (const name of controls) {
    const text = readFileSync(new URL('components/ui/' + name, root), 'utf8')
    assert.match(text, /var\(--color-|var\(--control-height|var\(--radius-/, name + ' must use global tokens')
  }
})

test('HR views do not introduce duplicated local primary buttons or dialog tags', () => {
  const dir = new URL('views/', root)
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.vue')) continue
    const content = readFileSync(new URL(name, dir), 'utf8')
    assert.doesNotMatch(content, /<dialog[\s>]/i, name + ' must use BaseDialog')
    assert.doesNotMatch(content, /<button[\s>]/i, name + ' must use BaseButton')
  }
})

test('organization and personnel views reuse shared page controls and typography', () => {
  for (const name of ['OrganizationView.vue', 'EmployeesView.vue']) {
    const content = readFileSync(new URL('views/' + name, root), 'utf8')
    for (const tag of ['BaseSelectField', 'BasePagination', 'BasePageHeading']) {
      assert.match(content, new RegExp('<' + tag + '\\b'), name + ' should use ' + tag)
    }
    assert.doesNotMatch(content, /<select[\s>]/i, name + ' should not duplicate select')
  }
  for (const token of ['--font-label-size', '--font-body-size', '--font-caption-size', '--font-section-heading']) {
    assert.match(tokens, new RegExp(token + ':'))
  }
})

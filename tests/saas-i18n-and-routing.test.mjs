import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const code = readFileSync(new URL('../src/i18n/saas.ts', import.meta.url), 'utf8')
const sf = ts.createSourceFile('saas.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
let locales
function find(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'saasCopy') locales = node.initializer
  ts.forEachChild(node, find)
}
find(sf)
assert.ok(ts.isAsExpression(locales), 'saasCopy should have a typed const expression')
const object = locales.expression
assert.ok(ts.isObjectLiteralExpression(object))
function entries(node) {
  const props = node.properties
  return new Map(props.filter(p => ts.isPropertyAssignment(p))
    .map(p => [p.name.getText(sf).replaceAll(/['"]/g, ''), p.initializer]))
}
const languages = entries(object)
const keys = ['ru', 'en', 'ka']
test('RU/EN/GE SaaS dictionaries provide matching complete key sets', () => {
  const all = keys.map(lang => {
    const doc = languages.get(lang)
    assert.ok(doc && ts.isObjectLiteralExpression(doc), lang + ' dictionary missing')
    return new Set(entries(doc).keys())
  })
  const root = [...all[0]].sort()
  assert.ok(root.length >= 140, 'SaaS glossary unexpectedly short')
  for (let index = 1; index < all.length; index++) {
    assert.deepEqual([...all[index]].sort(), root, keys[index] + ' key mismatch')
  }
})
test('all SaaS languages contain nonblank localized values', () => {
  for (const lang of keys) {
    const doc = languages.get(lang)
    for (const [name, value] of entries(doc)) {
      assert.ok(ts.isStringLiteral(value), lang + ':' + name + ' must be a literal')
      assert.ok(value.text.trim().length > 0, lang + ':' + name + ' is blank')
    }
  }
})
test('public routes and HRM workspace remain separate', () => {
  const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
  assert.match(router, /path: '\s*\/\s*'[^]*public\.home/)
  for (const piece of ["path: 'pricing'", "path: 'register'", "path: '/app'", "path: '/admin/:section?'"]) {
    assert.ok(router.includes(piece), 'Missing route ' + piece)
  }
  assert.match(router, /to\.name === 'platform-admin'/)
  assert.match(router, /apiRequest\('\/platform-admin\/overview'\)/)
})

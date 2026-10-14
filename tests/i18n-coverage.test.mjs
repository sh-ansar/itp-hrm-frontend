import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

// The reviewed RU prototype vocabulary is the source of truth.
// A missing Georgian entry must fail CI rather than silently displaying Russian.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const sourceCopy = read('src/composables/useWorkspaceI18n.ts')
const georgianCopy = read('src/i18n/workspaceGeorgian.ts')
const shell = read('src/i18n.ts')
const kaShell = read('src/i18n/kaShell.ts')

const russianKeys = [...sourceCopy.matchAll(/^\s*"([^"]+)":\s*\{\s*kk:/gm)].map(match => match[1])
const georgianPairs = [...georgianCopy.matchAll(/^\s*"([^"]+)":\s*"([^"]*)",?$/gm)]
const georgianKeys = georgianPairs.map(match => match[1])
const ruShellSource = shell.slice(shell.indexOf('const ru: Messages'), shell.indexOf('const kk: Messages'))
const russianShellKeys = [...ruShellSource.matchAll(/^\s*'([^']+)':/gm)].map(match => match[1])
const georgianShellKeys = [...kaShell.matchAll(/^\s*"([^"]+)":/gm)].map(match => match[1])

test('Georgian has a unique, non-empty translation for every reviewed workspace label', () => {
  assert.ok(russianKeys.length >= 600, 'unexpectedly incomplete source vocabulary')
  assert.equal(new Set(russianKeys).size, russianKeys.length, 'RU source has duplicates')
  assert.equal(new Set(georgianKeys).size, georgianKeys.length, 'Georgian translation has duplicates')
  assert.deepEqual(new Set(georgianKeys), new Set(russianKeys), 'Georgian workspace translations are missing keys')
  for (const [, key, translation] of georgianPairs) {
    assert.ok(translation.trim(), 'Missing Georgian text: ' + key)
    assert.match(translation, /[\u10A0-\u10FF]/u, 'No Georgian glyphs for: ' + key)
  }
})

test('Georgian navigation, settings, date locale and persisted preference are configured', () => {
  assert.deepEqual(new Set(georgianShellKeys), new Set(russianShellKeys), 'Georgian shell keys do not match RU shell')
  assert.match(shell, /\{ id: 'ka', name: 'ქართული' \}/)
  assert.match(read('src/stores/uiPreferences.ts'), /\['ru', 'kk', 'en', 'ka'\]/)
  assert.match(read('src/utils/localeFormat.ts'), /ka: 'ka-GE'/)
})

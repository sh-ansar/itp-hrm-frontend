import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// This test runs in the paired Laravel/frontend CI checkout. It never touches a database.
const backend = resolve(process.env.HRM_BACKEND_DIR || 'backend')
const source = resolve('src/api')

test('statically identifiable frontend API requests have matching Laravel method and route', () => {
  assert.ok(existsSync(join(backend, 'artisan')), 'reviewed Laravel checkout required')
  const result = spawnSync('php', ['artisan', 'route:list', '--path=api', '--json'], {
    cwd: backend, encoding: 'utf8', timeout: 60_000,
  })
  assert.equal(result.status, 0, 'Laravel route registration failed: ' + result.stderr?.slice(0, 500))
  const registered = JSON.parse(result.stdout).map(item => ({
    url: '/' + item.uri.replace(/^api\/v1\/?/, '').replace(/\{[^}]+\}/g, '*'),
    methods: String(item.method).split('|'),
  }))

  let matched = 0
  const missing = []
  for (const file of readdirSync(source).filter(name => name.endsWith('.ts'))) {
    const text = readFileSync(join(source, file), 'utf8')
    const calls = /apiRequest(?:<[^\n]+?>)?\s*\(\s*([`'"])([\s\S]*?)\1\s*(?:,\s*\{\s*method:\s*['"]([A-Z]+)['"])?/g
    for (const call of text.matchAll(calls)) {
      const path = call[2].split('?')[0].replace(/\$\{[^}]+\}/g, '*')
      // Dynamic helpers and concatenated query suffixes need linked browser E2E,
      // not a false-positive static failure. Only compare complete route shapes.
      if (!path.startsWith('/') || path.endsWith('/') || path.includes('**')
        || /[^/]\*/.test(path.replace(/\/\*/g, ''))) continue
      const method = call[3] || 'GET'
      if (!registered.some(route => route.url === path && route.methods.includes(method))) {
        missing.push(file + ': ' + method + ' ' + path)
      } else matched++
    }
  }
  assert.ok(matched >= 50, 'too few routes extracted: possible parser regression (' + matched + ')')
  assert.deepEqual(missing, [], 'frontend references endpoints missing in reviewed Laravel backend')
})

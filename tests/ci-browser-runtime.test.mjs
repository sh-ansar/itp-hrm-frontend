import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('pinned Chromium CI uses a supported, explicit Ubuntu image', () => {
  const directory = new URL('../.github/workflows/', import.meta.url)
  let checked = 0
  for (const name of readdirSync(directory)) {
    if (!/\.ya?ml$/.test(name)) continue
    const workflow = readFileSync(new URL(name, directory), 'utf8')
    if (!workflow.includes('playwright@1.56.1')) continue
    checked++
    assert.match(workflow, /^\s+runs-on: ubuntu-24\.04\s*$/m,
      name + ': Playwright 1.56.1 supports Ubuntu 24.04; rolling ubuntu-latest may move to an unsupported OS')
    assert.doesNotMatch(workflow, /runs-on: ubuntu-latest/,
      name + ': browser dependency installation must not follow a rolling OS alias')
    assert.match(workflow, /install --with-deps chromium/,
      name + ': preserve browser and system dependency installation')
  }
  assert.ok(checked >= 4, 'all existing browser integration workflows must remain discoverable')
})

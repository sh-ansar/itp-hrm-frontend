import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const indexFile = path.join(dist, 'index.html')

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}

check(fs.existsSync(indexFile), 'dist/index.html was not produced')
if (fs.existsSync(indexFile)) {
  const html = fs.readFileSync(indexFile, 'utf8')
  check(html.includes('id="app"'), 'dist/index.html is missing #app')
  check(html.includes('/assets/'), 'dist/index.html has no built asset references')
}

const assetsDir = path.join(dist, 'assets')
check(fs.existsSync(assetsDir), 'dist/assets was not produced')

if (fs.existsSync(assetsDir)) {
  const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'))
  check(jsFiles.length > 0, 'demo build produced no JavaScript bundle')
  const bundleText = jsFiles
    .map(file => fs.readFileSync(path.join(assetsDir, file), 'utf8'))
    .join('\n')
  check(bundleText.includes('ITP HRM Demo'),
    'demo fixture marker is absent from the production bundle')
  check(bundleText.includes('Demo API route not implemented'),
    'mock API implementation is absent from the production bundle')
}

if (failures.length) {
  console.error('\nDemo dist verification FAILED:')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}

console.log('Demo dist verification OK')
console.log(' - dist/index.html exists')
console.log(' - built JavaScript assets exist')
console.log(' - demo fixture and mock API are bundled')

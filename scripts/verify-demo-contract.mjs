import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const json = file => JSON.parse(read(file))

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}

const pkg = json('package.json')
const vercel = json('vercel.json')
const envDemo = read('.env.demo')
const router = read('src/router/index.ts')
const client = read('src/api/client.ts')
const mock = read('src/mocks/mockApi.ts')
const leaves = read('src/views/LeavesView.vue')
const timesheets = read('src/views/TimesheetsView.vue')
const reports = read('src/views/ReportsView.vue')

check(pkg.scripts?.['build:demo']?.includes('vite build --mode demo'),
  'package.json build:demo must build with --mode demo')
check(vercel.buildCommand === 'npm run build:demo',
  'vercel.json must deploy with npm run build:demo')
check(vercel.outputDirectory === 'dist',
  'vercel.json outputDirectory must remain dist')
check(Array.isArray(vercel.rewrites) && vercel.rewrites.some(rule =>
  rule?.source === '/(.*)' && rule?.destination === '/index.html'),
  'vercel.json must keep the SPA rewrite /(.*) -> /index.html')
check(/(?:^|\n)VITE_DEMO_MODE=true(?:\r?\n|$)/.test(envDemo),
  '.env.demo must enable VITE_DEMO_MODE=true')
check(/(?:^|\n)VITE_ENABLE_BROWSER_LOGIN=false(?:\r?\n|$)/.test(envDemo),
  '.env.demo must disable browser login')

const expectedRoutes = [
  '/', '/employees', '/employees-development', '/organization', '/staffing',
  '/personnel-actions', '/documents', '/directories', '/learning', '/reserve',
  '/leaves', '/timesheets', '/reports', '/settings',
]
for (const route of expectedRoutes) {
  check(router.includes(`path: '${route}'`) || router.includes(`path: "${route}"`),
    `router is missing demo route ${route}`)
}
check(router.includes("VITE_ENABLE_BROWSER_LOGIN === 'true'"),
  'router must derive login guard from VITE_ENABLE_BROWSER_LOGIN')
check(router.includes("if (!browserLoginEnabled || to.name === 'login') return true"),
  'demo mode must bypass the browser-login guard when login is disabled')

check(client.includes("import.meta.env.VITE_DEMO_MODE === 'true'"),
  'api client must switch to mockApi in demo mode')
check(client.includes('mockApiRequest<T>(path, options)'),
  'api client must call mockApiRequest in demo mode')

const mockContracts = [
  '/companies', 'departments', 'positions', 'employees', 'personnel-actions',
  'documents', 'staffing-plans', 'development',
]
for (const token of mockContracts) {
  check(mock.includes(token), `mockApi is missing contract token: ${token}`)
}

check(leaves.includes("const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'") &&
  leaves.includes('buildDemoLeaves') && leaves.includes('if (demoMode)'),
  'LeavesView must stay backend-independent in demo mode')
check(timesheets.includes("const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'") &&
  timesheets.includes('buildDemoTimesheet') && timesheets.includes('buildDemoCalendar'),
  'TimesheetsView must stay backend-independent in demo mode')
check(reports.includes("const demoMode = import.meta.env.VITE_DEMO_MODE === 'true'") &&
  reports.includes('buildDemoTimesheet'),
  'ReportsView must use demo worktime data in demo mode')

if (failures.length) {
  console.error('\nDemo deployment contract FAILED:')
  for (const failure of failures) console.error(' - ' + failure)
  process.exit(1)
}

console.log('Demo deployment contract OK')
console.log(' - Vercel uses build:demo')
console.log(' - browser login is disabled')
console.log(' - SPA rewrites are present')
console.log(' - all presentation routes are registered')
console.log(' - API client switches to mockApi')
console.log(' - leave/worktime/report views have demo fallbacks')

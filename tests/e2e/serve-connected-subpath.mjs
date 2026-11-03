import { createServer, request as httpRequest } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Test-only first-party gateway for an independently running Laravel process.
// Serves the production /hrm/ Vite build, not Vite dev mock APIs.
const root = resolve(fileURLToPath(new URL('../../dist', import.meta.url)))
const port = 4189
const upstream = { hostname: '127.0.0.1', port: 8000 }
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url || '/', 'http://127.0.0.1').pathname
  if (path.startsWith('/hrm-api/')) {
    const target = (req.url || '').replace(/^\/hrm-api/, '')
    const proxied = httpRequest({
      ...upstream,
      method: req.method,
      path: target,
      headers: { ...req.headers, host: '127.0.0.1:4189' },
    }, response => {
      res.writeHead(response.statusCode || 502, response.headers)
      response.pipe(res)
    })
    proxied.on('error', error => {
      console.error('Laravel upstream:', error.message)
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' })
      res.end('Test Laravel unavailable')
    })
    req.pipe(proxied)
    return
  }

  if (path !== '/hrm' && !path.startsWith('/hrm/')) {
    res.writeHead(404)
    res.end('Not a test HRM route')
    return
  }
  const relative = path === '/hrm' ? '' : path.slice('/hrm/'.length)
  let target = resolve(root, relative || 'index.html')
  if (!(target === root || target.startsWith(root + sep))) {
    res.writeHead(403)
    res.end()
    return
  }
  try {
    if (!(await stat(target)).isFile()) target = resolve(root, 'index.html')
  } catch {
    target = resolve(root, 'index.html')
  }
  try {
    const bytes = await readFile(target)
    res.writeHead(200, {
      'content-type': types[extname(target)] || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : bytes)
  } catch (error) {
    console.error('Static HRM:', error.message)
    res.writeHead(500)
    res.end('Test build unavailable')
  }
})
server.listen(port, '127.0.0.1', () => {
  console.log('Connected HRM test gateway listening on http://127.0.0.1:' + port + '/hrm/')
})

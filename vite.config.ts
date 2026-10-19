import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Development only. The browser sees ONE origin on port 5173.
// A deployment reverse proxy must provide equivalent same-origin routing.
const backend = process.env.HRM_DEV_BACKEND_TARGET || 'http://127.0.0.1:8000'
if (!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(backend)) {
  throw new Error('Dev backend proxy must target local loopback only')
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // '/' for Vercel/local, '/hrm/' when built into platform htdocs.
  const base = env.VITE_APP_BASE_PATH || '/'
  if (!/^\/(?:[a-z0-9-]+\/)*$/.test(base)) {
    throw new Error('VITE_APP_BASE_PATH must be a slash-delimited root path, e.g. /hrm/')
  }

  // Keep HRM routes separate from platform's existing /api alias.
  const gateway = env.VITE_BACKEND_PREFIX || ''
  if (gateway && !/^\/[a-z0-9-]+$/.test(gateway)) {
    throw new Error('VITE_BACKEND_PREFIX must be a single safe path segment, e.g. /hrm-api')
  }
  if (gateway && !(env.VITE_API_BASE_URL || '').startsWith(gateway + '/api/')) {
    throw new Error('HRM API must use the same isolated backend prefix')
  }

  return {
    base,
    plugins: [vue()],
    server: {
      port: 5173,
      proxy: gateway
        ? {
            // Production parity: when /hrm-api is enabled, do NOT silently
            // expose the existing platform's unprefixed /api, /auth, /sanctum.
            [gateway]: {
              target: backend,
              changeOrigin: false,
              rewrite: (path: string) => path.slice(gateway.length),
            },
          }
        : {
            '/api': { target: backend, changeOrigin: false },
            '/auth': { target: backend, changeOrigin: false },
            '/sanctum': { target: backend, changeOrigin: false },
          },
    },
  }
})

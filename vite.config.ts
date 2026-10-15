import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Development only. The browser sees ONE origin on port 5173.
// A deployment reverse proxy must provide equivalent same-origin routing.
const backend = process.env.HRM_DEV_BACKEND_TARGET || 'http://127.0.0.1:8000'
if (!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(backend)) {
  throw new Error('Dev backend proxy must target local loopback only')
}

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: backend, changeOrigin: false },
      '/auth': { target: backend, changeOrigin: false },
      '/sanctum': { target: backend, changeOrigin: false },
    },
  },
})

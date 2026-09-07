import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dulu di-serve bareng Laravel lewat laravel-vite-plugin.
// Sekarang berdiri sendiri: Vite hanya menangani React, dan endpoint /api & /storage
// di-proxy ke backend Express.js saat development supaya baseURL '/api' di lib/api.js
// tetap bekerja tanpa perlu CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Server config is only for local development
  // Production uses VITE_API_BASE_URL environment variable
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // Vite automatically copies files from public/ to dist/ during build
  // This includes _redirects, favicon.svg, etc.
  build: {
    outDir: 'dist',
    // Ensure public files are copied
    copyPublicDir: true,
  }
})



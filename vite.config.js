import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Build output goes to dist/ — Cloudflare Pages picks this up automatically
  build: {
    outDir: 'dist',
  },
})

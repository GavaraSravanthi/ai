import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['ai-study-planner-2026.onrender.com']
  },
  preview: {
    allowedHosts: ['ai-study-planner-2026.onrender.com']
  }
})
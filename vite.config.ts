import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { latexRenderPlugin } from './vite-plugin-render.ts'

export default defineConfig({
  plugins: [react(), latexRenderPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

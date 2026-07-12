import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { latexRenderPlugin } from './vite-plugin-render'

export default defineConfig({
  plugins: [react(), latexRenderPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

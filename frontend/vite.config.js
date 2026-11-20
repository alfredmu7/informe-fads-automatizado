import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://[::1]:5000',
        changeOrigin: true,
      },
      '/fotos': {
        target: 'http://[::1]:5000',
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/VedicAstro-Combined/',
  plugins: [react()],
  server: {
    proxy: {
      // Any request starting with /api will be forwarded to the real API
      '/api': {
        target: 'https://json.astrologyapi.com', // Use the actual base URL of the API
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') // Removes '/api' before sending to the server
      }
    }
  }
})
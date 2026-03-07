import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: process.env.OPENAI_API_KEY
      ? {
          '/api/openai/responses': {
            target: 'https://api.openai.com',
            changeOrigin: true,
            secure: true,
            rewrite: () => '/v1/responses',
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        }
      : undefined,
  },
})

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 將 /api 開頭的請求轉發到 Spring Boot 後端
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 圖片上傳路徑也轉發
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // 靜態圖片（Spring Boot static 資源）
      '/images': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})

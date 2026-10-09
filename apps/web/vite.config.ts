import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Cabul8R',
        short_name: 'Cabul8R',
        description: 'Takeoff and estimating for specialty manufactured products.',
        theme_color: '#181818',
        background_color: '#1f1f1f',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
        file_handlers: [{ action: '/', accept: { 'application/pdf': ['.pdf'] } }],
      },
      workbox: {
        // pdf.js and plan sheets are large; cache app code up to 10 MB per file.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,ttf,woff2}'],
      },
    }),
  ],
  server: { port: 5173 },
})

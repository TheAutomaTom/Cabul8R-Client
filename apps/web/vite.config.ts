import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { pdfjsAssets } from '@cabul8r/pdf/vite'

export default defineConfig({
  plugins: [
    vue(),
    pdfjsAssets(),
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
        // pdf.js is large; cache app code and its data files (fonts, cmaps, decoders) for offline use.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,mjs,css,html,svg,ttf,woff2,wasm,bcmap,pfb,icc}'],
      },
    }),
  ],
  server: { port: 5173 },
})

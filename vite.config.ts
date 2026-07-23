import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { qrcode } from 'vite-plugin-qrcode'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Expose the dev server on the LAN so a phone on the same Wi-Fi can reach it;
  // vite-plugin-qrcode prints a scannable QR of that network URL on startup.
  // Pin the port (strictPort) so the network URL never drifts to 5174 — keeps
  // the QR, phone bookmark, and Supabase redirect allow-list stable.
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    // Dev-only: keep the QR overlay/module out of the production bundle.
    command === 'serve' && qrcode(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Lelta — Household Cash Flow & Ledger',
        short_name: 'Lelta',
        description: 'Where household money flows — a shared cash-flow ledger and planner',
        theme_color: '#0b0f10',
        background_color: '#0b0f10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Offline read caching: app shell + recent Supabase REST reads
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))

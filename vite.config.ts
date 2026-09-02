import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/PixelForge/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt', 'sitemap.xml', 'og-image.png'],
      manifest: {
        name: 'PixelForge — Private Image Tools',
        short_name: 'PixelForge',
        description:
          'Compress, resize, convert, crop and optimize images directly in your browser. Your images never leave your device.',
        start_url: '/PixelForge/',
        scope: '/PixelForge/',
        display: 'standalone',
        background_color: '#f7f4ef',
        theme_color: '#161310',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,ico,svg,webmanifest,xml,txt}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\.png$/, /\.ico$/, /\.xml$/, /\.txt$/, /\.webmanifest$/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ],
  build: {
    sourcemap: false,
    target: 'es2018'
  },
  preview: {
    allowedHosts: true
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Brahmi — Work & Worker Management',
        short_name: 'Brahmi',
        description: 'Work & Worker Assignment Management PWA',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache DiceBear avatar SVGs to avoid repeat network requests
            urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dicebear-avatars-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Target modern browsers for better tree-shaking and smaller output
    target: 'es2020',
    // Minify with esbuild (default, fastest) — explicitly set for clarity
    minify: 'esbuild',
    cssMinify: true,
    // Raise chunk size warning limit slightly (individual vendor chunks may be 400-500 KiB)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunk splitting: separate heavy vendor libs from app code.
        // Each chunk gets its own cache fingerprint so browsers re-download
        // only the chunk that actually changed between deployments.
        manualChunks: {
          // React core — changes rarely, very long cache lifetime
          'vendor-react': ['react', 'react-dom'],
          // State management & data fetching
          'vendor-query': ['@tanstack/react-query', 'zustand'],
          // Radix UI primitives (large library, rarely changes)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
          ],
          // Lucide icons (large icon library)
          'vendor-lucide': ['lucide-react'],
          // Form handling
          'vendor-forms': ['react-hook-form', 'zod'],
          // Utilities
          'vendor-utils': ['clsx', 'tailwind-merge'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

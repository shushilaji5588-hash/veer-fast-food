import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function sqlWasmPlugin(): Plugin {
  return {
    name: 'sql-wasm-emitter',
    generateBundle() {
      const wasmPath = path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
      if (fs.existsSync(wasmPath)) {
        this.emitFile({
          type: 'asset',
          fileName: 'sql-wasm.wasm',
          source: fs.readFileSync(wasmPath),
        });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      sqlWasmPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'sql-wasm.wasm',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          '_headers',
          '_redirects',
        ],
        manifest: {
          id: '/',
          name: 'VEER FAST FOOD',
          short_name: 'VEER POS',
          description: 'Offline-First Restaurant & Hotel Management POS App for Android & iOS',
          theme_color: '#111827',
          background_color: '#111827',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,woff,woff2,webmanifest}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB to ensure sql-wasm.wasm (643KB) is precached
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /\.wasm$/i], // Never return index.html for .wasm requests
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'sqlite-wasm-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

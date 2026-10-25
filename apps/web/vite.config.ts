import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

function decartWorkerPlugin(): Plugin {
  return {
    name: 'decart-worker-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.includes('frame-metadata-worker.js')) {
          const candidatePaths = [
            path.resolve(__dirname, '../../node_modules/@decartai/sdk/dist/realtime/browser/frame-metadata-worker.js'),
            path.resolve(__dirname, 'node_modules/@decartai/sdk/dist/realtime/browser/frame-metadata-worker.js'),
            path.resolve(__dirname, 'public/frame-metadata-worker.js'),
          ];
          for (const workerPath of candidatePaths) {
            if (fs.existsSync(workerPath)) {
              res.setHeader('Content-Type', 'application/javascript');
              res.statusCode = 200;
              res.end(fs.readFileSync(workerPath));
              return;
            }
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    decartWorkerPlugin(),
    // Offline shell: the app opens with no connection once it has been visited online.
    // API responses are never cached here; the point of sale keeps its own data in IndexedDB.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AURA',
        short_name: 'AURA',
        description: 'Tienda y punto de venta AURA, también sin conexión.',
        lang: 'es',
        start_url: '/admin/ventas',
        scope: '/',
        display: 'standalone',
        background_color: '#FAF8F5',
        theme_color: '#0C0A09',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/docs/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'aura-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Product photos, so the point of sale shows them with no connection
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads') || url.hostname === 'res.cloudinary.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'aura-imagenes',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
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
  server: {
    port: 5173,
  },
});

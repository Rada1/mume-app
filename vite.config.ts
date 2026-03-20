import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon-1.png', 'icon-192.png', 'icon-512.png', 'favicon.ico'],
        manifest: {
          name: 'MUME - Multi-Users in Middle-earth',
          short_name: 'MUME',
          description: 'A premium web client for MUME (Multi-Users in Middle-earth) — the classic MUD.',
          start_url: '/',
          display: 'standalone',
          background_color: '#000000',
          theme_color: '#4ade80',
          orientation: 'any',
          scope: '/',
          icons: [
            {
              src: 'icon-1.png',
              sizes: '1024x1024',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Cache application shell and assets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,jpeg}'],
          // Exclude very large terrain images from precache (cached at runtime below)
          globIgnores: [
            '**/assets/map/m_peaks/**',
            '**/assets/map/hills/**',
          ],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit for background JPEG
          // Don't cache API/WebSocket calls
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/ws/],
          runtimeCaching: [
            {
              // Cache map assets
              urlPattern: /\/assets\/map\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'map-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              // Cache parchment textures and backgrounds
              urlPattern: /\.(png|jpe?g|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-assets',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
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
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

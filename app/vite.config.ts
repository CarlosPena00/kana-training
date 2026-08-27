import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline + installable web build (FR-035a, research.md D2).
// Everything the app needs is precached at install time; nothing is ever fetched at runtime.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Kana Flashcards',
        short_name: 'Kana',
        description: 'Offline flashcards for learning Japanese Hiragana and Katakana.',
        theme_color: '#182b60',
        background_color: '#182b60',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        // No runtime caching rules: the app makes no network requests at all.
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
});

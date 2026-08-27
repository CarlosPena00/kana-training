import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline + installable web build (FR-035a, research.md D2).
// Everything the app needs is precached at install time; nothing is ever fetched at runtime.
// GitHub Pages serves from /<repo>/, Capacitor and a root domain serve from /. The base is set
// per build rather than hardcoded, so the same source produces both.
const base = process.env['PUBLIC_BASE_PATH'] ?? '/';

export default defineConfig({
  base,
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
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        // No runtime caching rules: the app makes no network requests at all.
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
});

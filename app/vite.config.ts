import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline + installable web build (FR-035a, research.md D2).
// Everything the app needs is precached at install time; nothing is ever fetched at runtime.
// GitHub Pages serves from /<repo>/, Capacitor and a root domain serve from /. The base is set
// per build rather than hardcoded, so the same source produces both.
const base = process.env['PUBLIC_BASE_PATH'] ?? '/';

// package.json is the single source of truth for the release number the app shows. Android reads
// its own versionName from build.gradle, so the two are kept in step by hand at release time.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * The commit the build came from, appended to the release number.
 *
 * The release number alone cannot answer "am I looking at the build I just deployed?", because it
 * only moves when someone bumps it by hand — so every build between releases looks identical. That
 * ambiguity has already cost real debugging time: a cached service worker and a genuine bug are
 * indistinguishable on screen without it.
 *
 * Falls back to 'dev' rather than failing the build: git is absent in some packaging contexts, and
 * a missing SHA is not a reason to be unable to build.
 */
function commitSha(): string {
  if (process.env['PUBLIC_BUILD_SHA']) return process.env['PUBLIC_BUILD_SHA'].slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_SHA__: JSON.stringify(commitSha()),
  },
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

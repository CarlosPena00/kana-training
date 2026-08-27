import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
  projects: [
    // 320px is the narrowest viewport SC-005 requires.
    { name: 'mobile-320', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 640 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});

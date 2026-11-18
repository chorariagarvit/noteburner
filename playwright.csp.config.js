/**
 * Verifies the Content-Security-Policy in frontend/public/_headers against the PRODUCTION build.
 * (The Vite dev server injects inline scripts for hot reload, so it cannot be used for this.)
 *   npm run test:csp
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-csp',
  workers: 1,
  timeout: 90 * 1000,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:8787',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd frontend && npm run build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
    },
  ],
  use: { baseURL: 'http://localhost:4173' },
});

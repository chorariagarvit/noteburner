import crypto from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

// Mirrors backend/src/utils/appToken.js; secret matches the dev script's APP_TOKEN_SECRET
function makeTestAppToken() {
  const secret = process.env.APP_TOKEN_SECRET || 'dev-app-token-secret';
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 24 * 3600 * 1000, n: 'e2e' })).toString('base64url');
  return `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}


/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: 'html',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 6'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // }
  ],

  // /* Run local dev server before starting tests */
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:8787',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],

  // Use localhost API for tests
  use: {
    baseURL: 'http://localhost:5173',
    // Direct API calls in specs need a signed app token (same dev secret as backend `npm run dev`)
    extraHTTPHeaders: { 'X-App-Token': makeTestAppToken() },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});

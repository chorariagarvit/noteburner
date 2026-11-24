/**
 * The colour scheme on the PRODUCTION build with the real security headers: the colours that actually ship
 * (the minifier rewrites light-dark() for older browsers), the external early-apply script under the CSP, and the
 * page following the OS with no JavaScript at all.
 */
import { test, expect } from '@playwright/test';
import { applyProductionHeaders } from './headers.js';

const brightness = (page) => page.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
});

test.beforeEach(async ({ context }) => {
  await applyProductionHeaders(context);
  await context.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`));
    try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ }
  });
});

test('System follows the OS; Light and Dark override it (shipped CSS)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await brightness(page)).toBeLessThan(0.25);
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await brightness(page)).toBeGreaterThan(0.85);

  const toggle = page.locator('button[data-scheme]');
  await toggle.click(); // Light
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light');
  expect(await brightness(page)).toBeGreaterThan(0.85); // OS is dark, the page stays light
  await toggle.click(); // Dark
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await brightness(page)).toBeLessThan(0.25); // OS is light, the page stays dark
});

test('the saved scheme is applied by the external script under the CSP, with no violations', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('color-scheme', 'dark'); });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  expect(await brightness(page)).toBeLessThan(0.25);
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  const served = await page.request.get('/theme-init.js');
  expect(served.status()).toBe(200);
  expect(served.headers()['content-type']).toMatch(/javascript/);
});

for (const scheme of ['light', 'dark']) {
  test(`with JavaScript off the page still follows the OS (${scheme})`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: scheme });
    const page = await context.newPage();
    await page.goto('/');
    const b = await brightness(page);
    if (scheme === 'dark') expect(b).toBeLessThan(0.25); else expect(b).toBeGreaterThan(0.85);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light dark');
    await context.close();
  });
}

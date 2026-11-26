/**
 * The pages that describe the product: the changelog must show the released version, and the privacy
 * policy must cover what the app and the extension actually handle.
 */
import fs from 'node:fs';
import { test, expect } from './fixtures.js';

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test.describe('Changelog page', () => {
  test('lists the released version first, with its notes', async ({ page }) => {
    await page.goto('/changelog');
    const first = page.locator('h3', { hasText: /^v\d+\.\d+\.\d+$/ }).first();
    await expect(first).toHaveText(`v${version}`);
    await expect(page.getByText('Security hardening, quality and a three state theme').first()).toBeVisible();
  });

  test('keeps the older releases below it', async ({ page }) => {
    await page.goto('/changelog');
    await expect(page.locator('h3', { hasText: 'v1.14.0' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'v1.0.0' })).toBeVisible();
  });

  test('does not show week numbers or test counts', async ({ page }) => {
    await page.goto('/changelog');
    const text = await page.locator('main, #root').first().innerText();
    expect(text).not.toMatch(/Week \d+/);
    expect(text).not.toMatch(/\b186 E2E\b/);
  });
});

test.describe('Privacy policy', () => {
  test('describes the extension, IP handling, accounts and retention', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Browser Extension' })).toBeVisible();
    await expect(page.getByText('rate limiting and abuse protection')).toBeVisible();
    await expect(page.getByText('create an account: your email address')).toBeVisible();
    await expect(page.getByText('5 minutes to 7 days').first()).toBeVisible();
    await expect(page.getByText('Last Updated: November 26, 2026')).toBeVisible();
  });

  test('makes no claims the app does not keep', async ({ page }) => {
    await page.goto('/privacy');
    const text = await page.locator('#root').innerText();
    expect(text).not.toMatch(/No backups are retained/i);
    expect(text).not.toMatch(/max 7 days/i);
  });
});

test.describe('Footer', () => {
  test('links to both browser extension stores on every page', async ({ page }) => {
    for (const path of ['/', '/privacy']) {
      await page.goto(path);
      const links = page.getByTestId('extension-links');
      await expect(links.getByRole('link', { name: 'Chrome Web Store' }))
        .toHaveAttribute('href', 'https://chromewebstore.google.com/detail/noteburner/jibijfhlnoealebkcibpfpomfdllhhdc');
      await expect(links.getByRole('link', { name: 'Firefox Add-ons' }))
        .toHaveAttribute('href', 'https://addons.mozilla.org/en-US/firefox/addon/noteburner/');
    }
  });
});

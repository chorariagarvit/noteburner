/**
 * The browser extension popup follows the system light/dark setting by default, can be pinned with its
 * button (System, Light, Dark), and keeps the choice. The real popup.html runs here with a small stand-in
 * for the extension APIs.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';

const POPUP = pathToFileURL(path.resolve('extension/popup.html')).href;

/** Opens the popup with `stored` as the contents of chrome.storage.sync; `window.__saved` records what it writes. */
async function openPopup(page, stored = {}) {
  await page.addInitScript((initial) => {
    const data = { ...initial };
    window.__saved = {};
    window.chrome = {
      storage: {
        sync: {
          get: (keys, callback) => callback(Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]))),
          set: (values) => { Object.assign(data, values); Object.assign(window.__saved, values); },
        },
      },
      tabs: { query: async () => [], create: () => {} },
      scripting: { executeScript: async () => [] },
      runtime: { sendMessage: () => {} },
    };
  }, stored);
  await page.goto(POPUP);
}

const isDark = (page) => page.evaluate(() => document.body.classList.contains('dark-mode'));
const toggle = (page) => page.locator('#darkModeToggle');

test.describe('Extension popup colour scheme', () => {
  test('follows a dark system by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openPopup(page);
    await expect.poll(() => isDark(page)).toBe(true);
    await expect(toggle(page)).toHaveAttribute('aria-label', /System/);
  });

  test('follows a light system by default', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openPopup(page);
    await expect.poll(() => isDark(page)).toBe(false);
  });

  test('changes live when the system changes while it is open', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openPopup(page);
    await expect.poll(() => isDark(page)).toBe(false);
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => isDark(page)).toBe(true);
  });

  test('the button cycles System, Light, Dark and saves each choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openPopup(page);
    await expect.poll(() => isDark(page)).toBe(true);

    await toggle(page).click();                       // Light: pinned light even on a dark system
    await expect(toggle(page)).toHaveAttribute('aria-label', /Light/);
    expect(await isDark(page)).toBe(false);
    expect(await page.evaluate(() => window.__saved.colorScheme)).toBe('light');

    await toggle(page).click();                       // Dark
    await expect(toggle(page)).toHaveAttribute('aria-label', /Dark/);
    expect(await isDark(page)).toBe(true);

    await toggle(page).click();                       // back to System, which is dark here
    await expect(toggle(page)).toHaveAttribute('aria-label', /System/);
    expect(await isDark(page)).toBe(true);
    expect(await page.evaluate(() => window.__saved.colorScheme)).toBe('system');
  });

  test('a saved Light stays light on a dark system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openPopup(page, { colorScheme: 'light' });
    await expect(toggle(page)).toHaveAttribute('aria-label', /Light/);
    expect(await isDark(page)).toBe(false);
  });

  test('the old darkMode setting still gives dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openPopup(page, { darkMode: true });
    await expect.poll(() => isDark(page)).toBe(true);
  });

  test('the dark popup really uses dark colours and dark native controls', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openPopup(page);
    await expect.poll(() => isDark(page)).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
    const background = await page.evaluate(() => getComputedStyle(document.querySelector('.container')).backgroundColor);
    expect(background).toBe('rgb(31, 41, 55)');
  });
});

/**
 * Three-state colour scheme (System / Light / Dark): the header button, persistence, following the OS,
 * the migration from the old on/off switch, and sync between tabs.
 */
import { test, expect } from './fixtures.js';

const toggle = (page) => page.locator('button[data-scheme]');
const meta = (page) => page.locator('meta[name="color-scheme"]');
const stored = (page) => page.evaluate(() => localStorage.getItem('color-scheme'));

/** Perceived brightness of the page background, 0 (black) to 1 (white). Works for any CSS colour syntax. */
const pageBrightness = (page) => page.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
});
const expectDark = async (page) => expect.poll(() => pageBrightness(page)).toBeLessThan(0.25);
const expectLight = async (page) => expect.poll(() => pageBrightness(page)).toBeGreaterThan(0.85);
const cssColorScheme = (page) => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('noteburner_onboarding_complete', 'true'); });
});

test.describe('Colour scheme', () => {
  test('starts on System: nothing stored, the page follows the OS in both directions', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(toggle(page)).toHaveAttribute('data-scheme', 'system');
    await expect(toggle(page)).toHaveAttribute('aria-label', 'Theme: System');
    await expect(meta(page)).toHaveAttribute('content', 'light dark');
    expect(await stored(page)).toBeNull();
    await expectLight(page);

    await page.emulateMedia({ colorScheme: 'dark' }); // the OS switches while the page is open
    await expectDark(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await expectLight(page);
  });

  test('the button cycles System, Light, Dark, System; Light and Dark override the OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' }); // OS says dark: only an explicit choice can make it light
    await page.goto('/');
    await expectDark(page);

    await toggle(page).click(); // -> Light
    await expect(toggle(page)).toHaveAttribute('data-scheme', 'light');
    await expect(toggle(page)).toHaveAttribute('aria-label', 'Theme: Light');
    await expect(meta(page)).toHaveAttribute('content', 'light');
    expect(await stored(page)).toBe('light');
    expect(await cssColorScheme(page)).toBe('light');
    await expectLight(page);

    await page.emulateMedia({ colorScheme: 'light' }); // now the OS says light: only an explicit choice can make it dark
    await toggle(page).click(); // -> Dark
    await expect(toggle(page)).toHaveAttribute('data-scheme', 'dark');
    await expect(meta(page)).toHaveAttribute('content', 'dark');
    expect(await stored(page)).toBe('dark');
    expect(await cssColorScheme(page)).toBe('dark');
    await expectDark(page);

    await toggle(page).click(); // -> System again: the stored choice is removed and the OS (light) applies
    await expect(toggle(page)).toHaveAttribute('data-scheme', 'system');
    await expect(meta(page)).toHaveAttribute('content', 'light dark');
    expect(await stored(page)).toBeNull();
    await expectLight(page);
  });

  test('a pinned choice survives a reload and wins over the OS from the very first paint', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await toggle(page).click(); // Light
    await toggle(page).click(); // Dark
    await page.reload();
    await expect(toggle(page)).toHaveAttribute('data-scheme', 'dark');
    await expect(meta(page)).toHaveAttribute('content', 'dark');
    expect(await cssColorScheme(page)).toBe('dark');
    await expectDark(page);
  });

  test('every control keeps working in dark: native form fields use the dark scheme too', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/create');
    await toggle(page).click(); await toggle(page).click(); // Dark
    expect(await page.locator('textarea').first().evaluate((el) => getComputedStyle(el).colorScheme)).toBe('dark');
  });

  test('the old on/off switch is migrated once: "true" becomes Dark, "false" becomes System', async ({ page, context }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) { localStorage.setItem('darkMode', 'true'); sessionStorage.setItem('seeded', '1'); }
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(meta(page)).toHaveAttribute('content', 'dark');
    expect(await stored(page)).toBe('dark');
    expect(await page.evaluate(() => localStorage.getItem('darkMode'))).toBeNull();
    await expectDark(page);

    const other = await context.newPage();
    await other.addInitScript(() => {
      localStorage.removeItem('color-scheme');
      if (!sessionStorage.getItem('seeded')) { localStorage.setItem('darkMode', 'false'); sessionStorage.setItem('seeded', '1'); }
    });
    await other.goto('/');
    await expect(toggle(other)).toHaveAttribute('data-scheme', 'system');
    expect(await stored(other)).toBeNull();
    expect(await other.evaluate(() => localStorage.getItem('darkMode'))).toBeNull();
  });

  test('a change in one tab is picked up by the other open tabs', async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const second = await context.newPage();
    await second.emulateMedia({ colorScheme: 'light' });
    await second.goto('/');

    await toggle(second).click(); // Light
    await toggle(second).click(); // Dark
    await expect(toggle(page)).toHaveAttribute('data-scheme', 'dark');
    await expect(meta(page)).toHaveAttribute('content', 'dark');
    await expectDark(page);
  });
});

/**
 * Screen reader support across the site: landmarks, the skip link, focus and announcements on page changes,
 * the language of the page, announced errors, and modal dialogs that keep keyboard focus inside them.
 */
import { test, expect } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ }
  });
});

const activeId = (page) => page.evaluate(() => document.activeElement?.id ?? '');

test.describe('Landmarks and skip link', () => {
  test('every page has one banner, one main, one contentinfo and labelled navigation', async ({ page }) => {
    for (const path of ['/', '/privacy', '/support', '/login']) {
      await page.goto(path);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Footer' })).toBeVisible();
    }
  });

  test('the first Tab reaches a skip link that moves focus to the main content', async ({ page }) => {
    await page.goto('/privacy');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect.poll(() => activeId(page)).toBe('main-content');
  });
});

test.describe('Names', () => {
  test('every link and button in the header has an accessible name, on phones too', async ({ page }) => {
    for (const path of ['/', '/login']) {
      await page.goto(path);
      const controls = page.getByRole('banner').locator('a, button');
      const count = await controls.count();
      expect(count).toBeGreaterThan(3);
      for (let i = 0; i < count; i += 1) {
        await expect(controls.nth(i)).toHaveAccessibleName(/\S/);
      }
    }
  });
});

test.describe('Headings', () => {
  test('every public page has exactly one level 1 heading, and it is not just the site name', async ({ page }) => {
    for (const path of ['/', '/create', '/privacy', '/support', '/changelog', '/login', '/signup', '/forgot-password', '/pricing', '/docs/api', '/leaderboard', '/achievements']) {
      await page.goto(path);
      const headings = page.getByRole('heading', { level: 1 });
      await expect(headings, `${path} should have one h1`).toHaveCount(1);
      await expect(headings).not.toHaveText(/^NoteBurner$/);
    }
  });
});

test.describe('Page changes are announced', () => {
  test('following a link moves focus to the new page heading and announces it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Privacy' }).click();
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeFocused();
    await expect(page).toHaveTitle(/Privacy/);
    await expect(page.getByRole('status').filter({ hasText: 'page loaded' })).toContainText('Privacy');
  });

  test('a page that sets no title of its own gets one from its heading', async ({ page }) => {
    await page.goto('/privacy');
    const before = await page.title();
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Login' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await expect.poll(() => page.title()).not.toBe(before);
    await expect(page).toHaveTitle(/Welcome Back/);
  });
});

test.describe('Language of the page', () => {
  test('<html lang> follows the chosen language from the first render', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('noteburner_locale', 'es'); } catch { /* ignore */ } });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  });

  test('switching language changes <html lang> and loads that language only', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const requested = [];
    page.on('request', (request) => { if (/(locales\/|assets\/)(es|fr|de|hi|zh)[.-]/.test(request.url())) requested.push(request.url()); });
    await page.getByRole('button', { name: /language/i }).click();
    await page.getByRole('menuitem', { name: /Español/ }).or(page.getByText('Español')).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    expect(requested.length).toBe(1);
  });
});

test.describe('Errors are announced', () => {
  test('a failed sign in is announced as an alert', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('nobody@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Wrong-password-1!');
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

test.describe('Dialogs', () => {
  test('the welcome tutorial is a named modal dialog that keeps focus inside it', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.removeItem('noteburner_onboarding_complete'); } catch { /* ignore */ } });
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleName(/.+/);
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    }
  });
});

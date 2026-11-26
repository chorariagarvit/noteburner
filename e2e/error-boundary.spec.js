/**
 * E2E: a page that fails to load shows a recovery screen instead of a blank page,
 * and the rest of the site keeps working.
 */
import { test, expect } from './fixtures.js';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// The service worker would answer before page.route sees the request (WebKit)
test.use({ serviceWorkers: 'block' });

test.describe('A page that crashes', () => {
  test('shows a recovery screen with a way home, and other pages still open', async ({ page }) => {
    // Make the Support page's code fail to download, as it would on a flaky connection after a new release
    await page.route(/SupportPage/, (route) => route.abort());
    await page.goto(`${APP_URL}/`);
    await page.evaluate(() => {
      history.pushState({}, '', '/support');
      dispatchEvent(new PopStateEvent('popstate'));
    });

    const alert = page.getByRole('alert').filter({ hasText: /Something went wrong/i });
    await expect(alert).toBeVisible({ timeout: 15000 });
    await expect(alert.getByRole('button', { name: /Reload page/i })).toBeVisible();

    // The error clears when the visitor moves to another page
    await alert.getByRole('link', { name: /Home page/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /Something went wrong/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
});

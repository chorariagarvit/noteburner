/**
 * E2E: small-screen layout and zoom.
 * The page must fit a 390 px wide phone without sideways scrolling, and must never lock pinch-zoom.
 */
import { test, expect } from './fixtures.js';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const PAGES = ['/', '/create', '/pricing', '/login', '/signup', '/privacy', '/changelog', '/support'];

test.describe('Small screens', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of PAGES) {
    test(`${path} fits a 390 px screen without sideways scrolling`, async ({ page }) => {
      await page.goto(`${APP_URL}${path}`);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${path} is ${scrollWidth}px wide on a ${clientWidth}px screen`).toBeLessThanOrEqual(clientWidth);
    });
  }

  test('every header link stays reachable and inside the screen at 390 px', async ({ page }) => {
    await page.goto(APP_URL);
    const links = page.locator('header a, header button');
    const count = await links.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i += 1) {
      const box = await links.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x, `header item ${i} starts off the left edge`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `header item ${i} runs off the right edge`).toBeLessThanOrEqual(390.5);
    }
  });

  test('the viewport never blocks pinch-zoom', async ({ page }) => {
    await page.goto(APP_URL);
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).not.toMatch(/user-scalable\s*=\s*(no|0)/i);
    expect(content).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/i);
  });
});

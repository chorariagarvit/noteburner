/**
 * Shared Playwright fixtures.
 *
 * The API rate-limits per client IP and, locally, every request arrives from the same address,
 * so a full run exhausts the limits (app-token 30/min, signup 5/10min, create 10/min) and unrelated
 * tests start failing with 429. Each test therefore gets its own synthetic client IP via
 * `CF-Connecting-IP` (honoured by the local dev Worker; Cloudflare overwrites it in production),
 * for both page traffic and API `request` calls. Tests that deliberately hammer one endpoint
 * still hit the real limit, because they share an IP *within* the test.
 */
import { test as base, expect } from '@playwright/test';
import crypto from 'node:crypto';

// Rate-limit counters live in KV and PERSIST between runs (local state dir), while testIds are stable
// between runs. Without a per-run nonce a re-run reuses the same IPs and inherits the previous run's
// counters (e.g. login 10/5min), producing spurious 429s.
const RUN_NONCE = crypto.randomBytes(6).toString('hex');

function ipFor(testInfo) {
  const h = crypto.createHash('sha1').update(`${RUN_NONCE}:${testInfo.testId}:${testInfo.retry}:${testInfo.workerIndex}`).digest();
  return `10.${h[0]}.${h[1]}.${(h[2] % 253) + 1}`;
}

export const test = base.extend({
  context: async ({ context }, use, testInfo) => {
    await context.setExtraHTTPHeaders({
      ...(testInfo.project.use.extraHTTPHeaders || {}),
      'CF-Connecting-IP': ipFor(testInfo),
    });
    await use(context);
  },

  // On a freshly loaded page, WebKit under heavy CPU load sometimes delivers the first input event
  // in a way React never turns into onChange: the field is filled, then React writes the old (empty)
  // state back ~10ms later and the form submits without it. Real typing is seconds after load and
  // not affected in practice, but a scripted fill can land in that window. Verify the value stuck
  // and retry, so a test fails only on real defects.
  page: async ({ page }, use) => {
    const fill = page.fill.bind(page);
    page.fill = async (selector, value, options) => {
      // Fields may legitimately transform what is typed (e.g. the custom URL strips invalid
      // characters), so only a value that went back to what it was before the fill counts as lost.
      const before = await page.inputValue(selector, { timeout: 2000 }).catch(() => null);
      for (let attempt = 0; attempt < 6; attempt++) {
        await fill(selector, value, options);
        await page.waitForTimeout(80);
        const now = await page.inputValue(selector, { timeout: 2000 }).catch(() => null);
        if (now === null || before === null || now !== before || value === before) return;
      }
      throw new Error(`fill(${selector}) did not stick after 6 attempts`);
    };
    await use(page);
  },

  request: async ({ playwright, baseURL }, use, testInfo) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        ...(testInfo.project.use.extraHTTPHeaders || {}),
        'CF-Connecting-IP': ipFor(testInfo),
      },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect };

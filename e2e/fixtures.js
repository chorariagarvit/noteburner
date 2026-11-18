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

function ipFor(testInfo) {
  const h = crypto.createHash('sha1').update(`${testInfo.testId}:${testInfo.retry}:${testInfo.workerIndex}`).digest();
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

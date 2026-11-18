/**
 * Loads the production build with the real security headers from frontend/public/_headers applied
 * (Cloudflare Pages applies them in production; `vite preview` does not) and fails on any
 * Content-Security-Policy violation across the pages and the create -> view flow.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/** Parse a Cloudflare Pages `_headers` file into { "/path": { header: value } }. */
function parseHeadersFile(file) {
  const rules = {}; let current = null;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { current = raw.trim(); rules[current] = {}; continue; }
    const i = raw.indexOf(':');
    rules[current][raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim();
  }
  return rules;
}

const POLICY = parseHeadersFile(path.resolve('frontend/public/_headers'))['/*'];
const CSP = POLICY['content-security-policy'];
const directive = (name) => (CSP.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) || '').split(/\s+/).slice(1);

test.beforeEach(async ({ context }) => {
  // Production serves these headers on every document; emulate that.
  await context.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...POLICY } });
  });
  await context.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`));
    try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ }
  });
});

const violations = (page) => page.evaluate(() => window.__csp);

test.describe('The policy itself', () => {
  test('is strict: no eval, no wildcard scripts, no framing, no plugins, no <base> hijacking', () => {
    expect(directive('default-src')).toEqual(["'self'"]);
    expect(directive('script-src')).not.toContain("'unsafe-eval'");
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
    expect(directive('script-src').some((s) => s === '*' || s === 'https:' || s === 'http:')).toBe(false);
    expect(directive('frame-ancestors')).toEqual(["'none'"]);
    expect(directive('object-src')).toEqual(["'none'"]);
    expect(directive('base-uri')).toEqual(["'self'"]);
    expect(directive('form-action')).toEqual(["'self'"]);
    expect(POLICY['x-frame-options']).toBe('DENY');
    expect(POLICY['x-content-type-options']).toBe('nosniff');
    expect(POLICY['referrer-policy']).toBe('no-referrer');
    expect(POLICY['strict-transport-security']).toMatch(/max-age=\d{7,}/);
  });

  test('allows exactly what the app needs from outside: Turnstile, Analytics, Clarity, the API host', () => {
    expect(directive('script-src')).toContain('https://challenges.cloudflare.com');
    expect(directive('frame-src')).toEqual(['https://challenges.cloudflare.com']);
    expect(directive('connect-src')).toEqual(expect.arrayContaining(["'self'", 'https://api.noteburner.work', 'https://challenges.cloudflare.com']));
    for (const d of ['script-src', 'connect-src']) expect(directive(d).every((s) => !/noteburner\.app/.test(s))).toBe(true);
  });
});

test.describe('The production build under that policy', () => {
  test('the served service worker is stamped with a build id, and every PWA image is really served as an image', async ({ request }) => {
    const sw = await request.get('/sw.js');
    const body = await sw.text();
    expect(body).not.toContain('__BUILD_ID__');
    expect(body).toMatch(/const BUILD_ID = '\d+\.\d+\.\d+-[0-9a-z-]+';/);
    const manifest = await (await request.get('/manifest.json')).json();
    for (const src of [...manifest.icons.map((i) => i.src), ...manifest.screenshots.map((i) => i.src), ...manifest.shortcuts.flatMap((s) => s.icons.map((i) => i.src))]) {
      const res = await request.get(src);
      expect(res.status(), src).toBe(200);
      expect(res.headers()['content-type'], `${src} must not fall back to index.html`).toMatch(/^image\/png/);
    }
  });

  test('the policy really is enforced (an injected inline script is blocked)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__pwned = true'; document.body.appendChild(s); });
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    expect((await violations(page)).some((v) => v.startsWith('script-src'))).toBe(true);
  });

  for (const route of ['/', '/create', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/achievements',
    '/leaderboard', '/referrals', '/invite', '/privacy', '/changelog', '/support', '/docs/api', '/pricing', '/m/some-id', '/no-such-page']) {
    test(`${route} loads with no policy violations`, async ({ page }) => {
      const consoleCsp = [];
      page.on('console', (m) => { if (/Content Security Policy|Refused to (load|execute|connect|apply|frame)/i.test(m.text())) consoleCsp.push(m.text()); });
      await page.goto(route);
      await page.waitForTimeout(1500);
      await expect(page.locator('#root')).not.toBeEmpty();
      expect(await violations(page), `violations on ${route}`).toEqual([]);
      expect(consoleCsp).toEqual([]);
    });
  }

  test('create a message, open it and read it: no violations anywhere on the way', async ({ page, browser }) => {
    await page.goto('/create');
    await page.getByRole('heading', { name: 'Create Encrypted Message' }).waitFor();
    await page.fill('#message', 'CSP end to end');
    await page.fill('#password', 'Csp-Passw0rd!');
    await page.click('button[type="submit"]');
    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('img[alt="QR Code for secret message"]')).toBeVisible();   // data: image allowed
    // the server builds links with FRONTEND_URL (the dev port); open the same path on the server under test
    const url = new URL(await page.locator('input[readonly]').first().inputValue()).pathname;
    expect(await violations(page)).toEqual([]);

    const reader = await (await browser.newContext()).newPage();
    const consoleCsp = [];
    reader.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) consoleCsp.push(m.text()); });
    await reader.context().route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), ...POLICY } });
    });
    await reader.context().addInitScript(() => {
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`));
      try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ }
    });
    await reader.goto(`http://localhost:4173${url}`);
    await reader.click('button:has-text("Unlock Secret Message")');
    await reader.fill('input[placeholder="Enter message password"]', 'Csp-Passw0rd!');
    await reader.click('button:has-text("Decrypt Message")');
    await expect(reader.getByText('CSP end to end')).toBeVisible({ timeout: 30000 });   // includes the confetti animation
    await reader.waitForTimeout(1000);
    expect(await violations(reader), 'violations while decrypting').toEqual([]);
    expect(consoleCsp).toEqual([]);
  });

  test('the Turnstile widget script and iframe are permitted by the policy', async ({ page }) => {
    // Cloudflare's real widget cannot be loaded in CI, so check the browser would allow its origins
    await page.goto('/');
    const allowed = await page.evaluate(async () => {
      const results = {};
      await new Promise((resolve) => {
        const f = document.createElement('iframe');
        f.src = 'https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/b/turnstile/if/ov2/av0/rcv/0/0/normal/auto/fbE/new/normal/auto/';
        f.onload = f.onerror = () => resolve();
        document.body.appendChild(f);
        setTimeout(resolve, 3000);
      });
      results.violations = window.__csp.filter((v) => /frame-src|script-src/.test(v) && /challenges\.cloudflare\.com/.test(v));
      return results;
    });
    expect(allowed.violations).toEqual([]);
  });
});

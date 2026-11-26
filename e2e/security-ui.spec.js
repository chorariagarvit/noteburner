/**
 * UI tests for the behaviour added/fixed during the security hardening work:
 * server-enforced one-time access, 2FA, error handling, extension prefill, online/offline
 * notices, login redirects, email verification page and light-mode contrast.
 * Runs on every configured browser.
 */
import { test, expect } from './fixtures.js';
import { generateTOTP } from '../backend/src/utils/totp.js';

const API = 'http://localhost:8787/api';

test.describe.configure({ timeout: 90_000 }); // two PBKDF2 derivations per create/unlock: slow on WebKit/mobile

test.beforeEach(async ({ page }) => {
  // The first-visit onboarding modal can cover the page
  await page.addInitScript(() => {
    try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ }
  });
});

async function openCreate(page) {
  await page.goto('/create');
  await page.getByRole('heading', { name: 'Create Encrypted Message' }).waitFor();
}

/** Create a message through the real UI and return { url, password, secret? } */
async function createViaUi(page, { message = 'UI secret message', password = 'UiTest-Passw0rd!', attempts, twoFA } = {}) {
  await openCreate(page);
  await page.fill('#message', message);
  await page.fill('#password', password);
  if (attempts) await page.selectOption('#max-password-attempts', String(attempts));
  if (twoFA) await page.getByLabel('Require 2FA code (TOTP)').check();
  await page.click('button[type="submit"]');
  await expect(page.getByRole('heading', { name: 'Message Created Successfully' })).toBeVisible({ timeout: 30000 });
  const url = await page.locator('input[readonly]').first().inputValue();
  let secret;
  if (twoFA) {
    await expect(page.locator('img[alt="TOTP QR Code"]')).toBeVisible({ timeout: 15000 });
    secret = (await page.locator('text=/^[A-Z2-7]{32}$/').first().innerText()).trim();
  }
  return { url, password, secret, message };
}

async function openUnlock(page, url) {
  await page.goto(url);
  await page.click('button:has-text("Unlock Secret Message")');
  await expect(page.locator('input[placeholder="Enter message password"]')).toBeVisible();
}

async function tryPassword(page, password) {
  await page.fill('input[placeholder="Enter message password"]', password);
  await page.click('button:has-text("Decrypt Message")');
}

test.describe('One-time access in the UI', () => {
  test('wrong passwords show the attempts left, the right one decrypts, then the link is dead', async ({ page }) => {
    const m = await createViaUi(page, { attempts: 3 });
    await openUnlock(page, m.url);

    await tryPassword(page, 'definitely-wrong-1');
    await expect(page.getByText('Incorrect password. 2 attempt(s) remaining.')).toBeVisible({ timeout: 30000 });
    await tryPassword(page, 'definitely-wrong-2');
    await expect(page.getByText('Incorrect password. 1 attempt(s) remaining.')).toBeVisible({ timeout: 30000 });

    await tryPassword(page, m.password);
    await expect(page.getByText(m.message)).toBeVisible({ timeout: 30000 });

    // the message is gone for everyone now: its link says so, and offers nothing to unlock
    await page.goto(m.url);
    await expect(page.getByRole('heading', { level: 1, name: 'Message not found' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unlock Secret Message' })).toHaveCount(0);
    await expect(page.getByText(m.message)).toHaveCount(0);
  });

  test('exhausting the attempts destroys the message', async ({ page }) => {
    const m = await createViaUi(page, { attempts: 1 });
    await openUnlock(page, m.url);
    await tryPassword(page, 'wrong-password-1');
    await expect(page.getByText(/destroyed|no longer available|not found|already/i).first()).toBeVisible({ timeout: 30000 });
    // even the correct password cannot recover it
    const status = await page.request.get(`${API}/messages/${m.url.split('/m/')[1]}/meta`);
    expect(status.status()).toBe(404);
  });

  test('"Unlimited" password attempts really means unlimited', async ({ page }) => {
    const m = await createViaUi(page, { attempts: -1 });
    await openUnlock(page, m.url);
    for (let i = 0; i < 5; i++) {
      await tryPassword(page, `wrong-guess-${i}`);
      await expect(page.getByText('Incorrect password.', { exact: false }).first()).toBeVisible({ timeout: 30000 });
    }
    await tryPassword(page, m.password);
    await expect(page.getByText(m.message)).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Two-factor (TOTP) flow', () => {
  test('creator sees a real QR code + secret; recipient needs the code, then the password', async ({ page }) => {
    const m = await createViaUi(page, { twoFA: true });
    // QR is an actual rendered image (regression: it never rendered because of a missing field)
    const src = await page.locator('img[alt="TOTP QR Code"]').getAttribute('src');
    expect(src).toMatch(/^data:image\/png;base64,/);
    expect(m.secret).toMatch(/^[A-Z2-7]{32}$/);

    await openUnlock(page, m.url);
    // password alone is not enough: the code step comes first
    await expect(page.locator('input[aria-label="Digit 1"]')).toBeVisible();
    const code = generateTOTP(m.secret);
    for (let i = 0; i < 6; i++) await page.fill(`input[aria-label="Digit ${i + 1}"]`, code[i]);
    await expect(page.getByText(/verified/i).first()).toBeVisible({ timeout: 20000 });

    await tryPassword(page, m.password);
    await expect(page.getByText(m.message)).toBeVisible({ timeout: 30000 });
  });

  test('a wrong code is rejected and does not unlock the message', async ({ page }) => {
    const m = await createViaUi(page, { twoFA: true });
    await openUnlock(page, m.url);
    for (let i = 0; i < 6; i++) await page.fill(`input[aria-label="Digit ${i + 1}"]`, String((i * 7 + 3) % 10));
    await expect(page.getByText(/invalid|incorrect|expired/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(m.message)).toHaveCount(0);
  });
});

test.describe('Errors and edge cases', () => {
  // page.route() does not see requests that a service worker handles (WebKit in particular), and
  // this app registers one, so block it for tests that mock API responses.
  test.use({ serviceWorkers: 'block' });

  test('an HTML response where JSON is expected shows a friendly error, not "Unexpected token <"', async ({ page }) => {
    await page.route('**/api/messages', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>gateway</body></html>' });
    });
    await openCreate(page);
    await page.fill('#message', 'will not be created');
    await page.fill('#password', 'UiTest-Passw0rd!');
    await page.click('button[type="submit"]');
    const alert = page.getByText(/Unexpected server response/i).first();
    await expect(alert).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Unexpected token/i)).toHaveCount(0);
  });

  test('a server error body that is not JSON is reported with its HTTP status', async ({ page }) => {
    await page.route('**/api/messages', (route) => route.request().method() === 'POST'
      ? route.fulfill({ status: 502, contentType: 'text/html', body: '<html>Bad gateway</html>' })
      : route.continue());
    await openCreate(page);
    await page.fill('#message', 'x');
    await page.fill('#password', 'UiTest-Passw0rd!');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/502/).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Unexpected token/i)).toHaveCount(0);
  });

  test('the extension hand-off (#text=) prefills the message and is removed from the URL', async ({ page }) => {
    await page.goto('/create#text=Hello%20from%20the%20extension');
    await expect(page.locator('#message')).toHaveValue('Hello from the extension');
    expect(page.url()).not.toContain('Hello');
    expect(page.url()).not.toContain('#text');
  });

  test('legacy ?text= still prefills and is stripped too', async ({ page }) => {
    await page.goto('/create?text=Legacy%20text');
    await expect(page.locator('#message')).toHaveValue('Legacy text');
    await expect.poll(() => page.url()).not.toContain('Legacy');
  });

  test('the app attaches an anonymous app token to API calls automatically', async ({ page }) => {
    const seen = [];
    page.on('request', (r) => { if (r.url().includes('/api/stats')) seen.push(r.headers()['x-app-token']); });
    await page.goto('/');
    await expect.poll(() => seen.length, { timeout: 15000 }).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
  });
});

test.describe('Offline / online notices', () => {
  // Toasts live for 3s and the dev server can take longer than that to finish loading, so record
  // every toast the moment it is inserted instead of looking for it afterwards.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__toasts = [];
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            const text = n.nodeType === 1 ? n.textContent : '';
            if (/Back online|You are offline/.test(text) && String(n.className).includes('fixed')) window.__toasts.push(text.trim());
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
  });
  const toasts = (page) => page.evaluate(() => window.__toasts);

  test('no popup at all on a normal first load (regression: "Back online" fired every visit)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500);
    expect(await toasts(page)).toEqual([]);
  });

  test('one offline notice, then exactly one back-online notice', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await context.setOffline(true);
    await expect.poll(() => toasts(page), { timeout: 10000 }).toEqual(['⚠ You are offline']);
    await context.setOffline(false);
    await expect.poll(() => toasts(page), { timeout: 10000 }).toEqual(['⚠ You are offline', '✓ Back online']);
    await page.waitForTimeout(3000);
    expect(await toasts(page)).toHaveLength(2); // and it does not repeat
  });

  test('a flapping connection that ends up where it started does not notify', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) { await context.setOffline(true); await context.setOffline(false); }
    await page.waitForTimeout(3500); // longer than the 1.5s debounce
    expect(await toasts(page)).toEqual([]);
  });
});

test.describe('Accounts', () => {
  async function signup(request) {
    const email = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    const res = await request.post(`${API}/auth/signup`, { data: { email, password: 'Str0ng!Passw0rd#1' } });
    expect(res.status()).toBe(201);
    return email;
  }
  async function loginViaUi(page, email) {
    await page.fill('#email', email);
    await page.fill('#password', 'Str0ng!Passw0rd#1');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
  }

  test('?redirect= is honoured for same-origin paths', async ({ page, request }) => {
    const email = await signup(request);
    await page.goto('/login?redirect=/pricing');
    await loginViaUi(page, email);
    expect(new URL(page.url()).pathname).toBe('/pricing');
  });

  for (const evil of ['//evil.example/phish', 'https://evil.example', '/\\evil.example', 'javascript:alert(1)']) {
    test(`?redirect=${evil} is ignored (open-redirect protection)`, async ({ page, request }) => {
      const email = await signup(request);
      await page.goto(`/login?redirect=${encodeURIComponent(evil)}`);
      await loginViaUi(page, email);
      expect(new URL(page.url()).origin).toBe(new URL(page.url()).origin);
      expect(page.url()).not.toContain('evil.example');
      expect(new URL(page.url()).pathname).toBe('/');
    });
  }

  test('verify-email page: missing and invalid tokens show a clear message', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page.getByText(/missing its token/i)).toBeVisible();

    await page.goto('/verify-email?token=this-token-is-not-valid');
    await expect(page.getByText(/invalid or has expired|expired|invalid/i).first()).toBeVisible({ timeout: 20000 });
    expect(page.url()).not.toContain('this-token-is-not-valid'); // one-time token is removed from the address bar
  });

  test('a signed-in session survives a reload but a revoked one does not', async ({ page, request }) => {
    const email = await signup(request);
    await page.goto('/login');
    await loginViaUi(page, email);
    await page.reload();
    await expect(page.locator('a[href="/login"]')).toBeHidden({ timeout: 15000 });

    const token = await page.evaluate(() => sessionStorage.getItem('sessionToken') || localStorage.getItem('sessionToken'));
    expect((await request.delete(`${API}/auth/sessions`, { headers: { 'X-Session-Token': token } })).status()).toBe(200);
    await page.reload();
    await expect(page.locator('a[href="/login"]')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Country restriction in the UI', () => {
  // Play visitors from different countries by adding the (dev-only) CF-IPCountry header to API calls.
  test.use({ serviceWorkers: 'block' });
  const asCountry = async (page, cc) => {
    await page.route('**/api/**', (route) => route.continue({ headers: { ...route.request().headers(), 'cf-ipcountry': cc } }));
  };
  const newVisitor = async (browser, cc) => {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      extraHTTPHeaders: { 'CF-Connecting-IP': `172.${20 + Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}` },
    });
    await context.addInitScript(() => { try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ } });
    const page = await context.newPage();
    await asCountry(page, cc);
    return { context, page };
  };

  test('the options say what they really do', async ({ page }) => {
    await openCreate(page);
    await expect(page.getByText('Restrict to same country')).toBeVisible();
    await expect(page.getByText(/Cloudflare detects the country/i)).toBeVisible();
    await expect(page.getByText('Auto-burn on suspicious activity')).toBeVisible();
    await expect(page.getByText(/more than one country, or connects through Tor/i)).toBeVisible();
  });

  test('a restricted message opens in the sender\'s country and is blocked, with a clear notice, elsewhere', async ({ page, browser }) => {
    await asCountry(page, 'DE');
    await openCreate(page);
    await page.fill('#message', 'Only for people in Germany');
    await page.fill('#password', 'GeoTest-Passw0rd!');
    await page.getByLabel('Restrict to same country').check();
    await page.click('button[type="submit"]');
    await expect(page.getByRole('heading', { name: 'Message Created Successfully' })).toBeVisible({ timeout: 30000 });
    const url = await page.locator('input[readonly]').first().inputValue();

    // a visitor from France sees why they can't open it, and cannot start
    const fr = await newVisitor(browser, 'FR');
    await fr.page.goto(url);
    await expect(fr.page.getByRole('alert')).toContainText(/sender's country/i, { timeout: 20000 });
    await expect(fr.page.locator('button:has-text("Unlock Secret Message")')).toBeDisabled();
    await fr.context.close();

    // a visitor from Germany is let through and can read it
    const de = await newVisitor(browser, 'DE');
    await de.page.goto(url);
    await expect(de.page.locator('button:has-text("Unlock Secret Message")')).toBeEnabled({ timeout: 20000 });
    await expect(de.page.getByRole('alert')).toHaveCount(0);
    await de.page.click('button:has-text("Unlock Secret Message")');
    await tryPassword(de.page, 'GeoTest-Passw0rd!');
    await expect(de.page.getByText('Only for people in Germany')).toBeVisible({ timeout: 30000 });
    await de.context.close();
  });

  test('creating a restricted message when the country is unknown explains what to do', async ({ page }) => {
    await asCountry(page, 'XX');
    await openCreate(page);
    await page.fill('#message', 'x');
    await page.fill('#password', 'GeoTest-Passw0rd!');
    await page.getByLabel('Restrict to same country').check();
    await page.click('button[type="submit"]');
    await expect(page.getByText(/country could not be determined/i).first()).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Human verification (Turnstile)', () => {
  // The server only asks for a challenge when TURNSTILE_SECRET_KEY is set (off in dev/CI), so both the
  // server's refusal and Cloudflare's widget script are simulated here.
  test.use({ serviceWorkers: 'block' });

  const FAKE_TURNSTILE = `
    window.__turnstile = { renders: [], removed: [] };
    window.turnstile = {
      render(el, opts) {
        window.__turnstile.renders.push({ sitekey: opts.sitekey, appearance: opts.appearance });
        setTimeout(() => (window.__MODE === 'fail' ? opts['error-callback']() : opts.callback('solved-123')), 30);
        return 'widget-1';
      },
      remove(id) { window.__turnstile.removed.push(id); },
    };`;

  async function arm(page, { solveOk = true } = {}) {
    const tokenRequests = [];
    await page.route('**/challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
      route.fulfill({ contentType: 'application/javascript', body: (solveOk ? '' : 'window.__MODE="fail";') + FAKE_TURNSTILE }));
    await page.route('**/api/app-token', (route) => {
      const body = route.request().postData();
      tokenRequests.push(body);
      if (!body || !body.includes('turnstileToken')) {
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'A quick verification is required.', code: 'CHALLENGE_REQUIRED', siteKey: 'test-site-key' }) });
      }
      return route.continue();
    });
    return tokenRequests;
  }

  test('a refused token request triggers the widget, then retries with the solved token and carries on', async ({ page }) => {
    const tokenRequests = await arm(page);
    const statsTokens = [];
    page.on('request', (r) => { if (r.url().includes('/api/stats')) statsTokens.push(r.headers()['x-app-token']); });

    await page.goto('/');
    await expect.poll(() => statsTokens.length, { timeout: 20000 }).toBeGreaterThan(0);
    expect(statsTokens.every(Boolean), 'API calls carry the app token obtained after the challenge').toBe(true);

    expect(tokenRequests.length).toBe(2);                                        // refused once, then retried
    expect(JSON.parse(tokenRequests[1])).toEqual({ turnstileToken: 'solved-123' });
    const rendered = await page.evaluate(() => window.__turnstile);
    expect(rendered.renders).toEqual([{ sitekey: 'test-site-key', appearance: 'interaction-only' }]);   // invisible unless needed
    expect(rendered.removed).toEqual(['widget-1']);                              // widget is cleaned up
    await expect(page.getByTestId('turnstile-box')).toHaveCount(0);
  });

  test('a creator can still make a message after passing the challenge', async ({ page }) => {
    await arm(page);
    const m = await createViaUi(page, { message: 'created behind a challenge' });
    expect(m.url).toContain('/m/');
  });

  test('if the widget fails, the app does not crash (calls just go out unauthenticated)', async ({ page }) => {
    await arm(page, { solveOk: false });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.waitForTimeout(2500);
    await expect(page.locator('#root')).not.toBeEmpty();
    expect(errors.filter((m) => !/access control checks|Load failed|Failed to fetch/.test(m)), errors.join(' | ')).toEqual([]);
    await expect(page.getByTestId('turnstile-box')).toHaveCount(0);
  });
});

test.describe('Light mode', () => {
  test.use({ colorScheme: 'light' });

  const luminance = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (css) => css.match(/[\d.]+/g).slice(0, 3).map(Number);
  const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

  test('achievement cards are readable (WCAG AA contrast) in light mode', async ({ page }) => {
    await page.goto('/achievements');
    await expect(page.getByRole('heading', { name: /In Progress/i })).toBeVisible();
    const card = page.locator('div.border-2').filter({ hasText: 'Speed Demon' }).first();
    await expect(card).toBeVisible();
    const { bg, title, desc } = await card.evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      title: getComputedStyle(el.querySelector('h3')).color,
      desc: getComputedStyle(el.querySelector('p')).color,
    }));
    expect(contrast(parse(title), parse(bg)), `title ${title} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parse(desc), parse(bg)), `description ${desc} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
});

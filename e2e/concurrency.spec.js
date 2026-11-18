/**
 * Race-condition tests. The one-time guarantees (single view, attempt limits, single burn, unique
 * accounts/slugs, idempotent billing) rely on atomic SQL; these tests fire many requests at once
 * and check the invariants still hold. API only, so Chromium only.
 */
import { test, expect } from './fixtures.js';
import { API, IV, PASSWORD, createMessage, newUser, d1, uniq, randomIp, sha256 } from './api-helpers.js';
import crypto from 'node:crypto';

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

const count = (statuses, code) => statuses.filter((s) => s === code).length;
const parallel = (n, fn) => Promise.all(Array.from({ length: n }, (_, i) => fn(i)));

test.describe('One-time access under concurrency', () => {
  test('12 simultaneous fetches of a single-view message: exactly one gets the ciphertext', async ({ request }) => {
    const m = await createMessage(request);
    const res = await parallel(12, () => request.get(`${API}/messages/${m.token}`, { headers: { 'X-Auth-Tag': m.authTag } }));
    const statuses = res.map((r) => r.status());
    expect(count(statuses, 200), statuses.join()).toBe(1);
    expect(statuses.filter((s) => s !== 200).every((s) => [404, 410].includes(s)), statuses.join()).toBe(true);
  });

  test('max views = 3 under a race: exactly three fetches succeed, with distinct countdowns', async ({ request }) => {
    const m = await createMessage(request, { body: { maxViews: 3 } });
    const res = await parallel(12, () => request.get(`${API}/messages/${m.token}`, { headers: { 'X-Auth-Tag': m.authTag } }));
    const ok = res.filter((r) => r.status() === 200);
    expect(ok.length).toBe(3);
    const remaining = (await Promise.all(ok.map((r) => r.json()))).map((j) => j.viewsRemaining).sort();
    expect(remaining).toEqual([0, 1, 2]);
  });

  test('parallel wrong passwords never succeed, are counted atomically and burn the message once', async ({ request }) => {
    const m = await createMessage(request, { body: { maxPasswordAttempts: 3 } });
    const bad = { 'X-Auth-Tag': Buffer.alloc(32, 5).toString('base64') };
    const res = await parallel(12, () => request.get(`${API}/messages/${m.token}`, { headers: bad }));
    const statuses = res.map((r) => r.status());
    const bodies = await Promise.all(res.map((r) => r.json().catch(() => ({}))));
    expect(count(statuses, 200)).toBe(0);
    expect(bodies.filter((b) => b.code === 'BURNED_ATTEMPTS').length, 'burn reported exactly once').toBe(1);
    expect(bodies.filter((b) => /2 attempt\(s\) remaining/.test(b.error || '')).length).toBe(1);
    expect(bodies.filter((b) => /1 attempt\(s\) remaining/.test(b.error || '')).length).toBe(1);
    // nothing misleading is ever returned for a message that is already gone
    expect(bodies.filter((b) => /3 attempt\(s\) remaining/.test(b.error || '')).length).toBe(0);
    expect((await request.get(`${API}/messages/${m.token}/meta`)).status()).toBe(404);
    expect((await request.get(`${API}/messages/${m.token}`, { headers: { 'X-Auth-Tag': m.authTag } })).status()).toBe(404);
  });

  test('a burst of 2FA guesses from many IPs burns the message and never authenticates', async ({ request }) => {
    const m = await createMessage(request, { body: { require2FA: 1 } });
    const res = await parallel(15, (i) => request.post(`${API}/messages/${m.token}/verify-totp`, {
      headers: { 'CF-Connecting-IP': randomIp() }, data: { code: String(300000 + i) },
    }));
    const statuses = res.map((r) => r.status());
    expect(count(statuses, 200)).toBe(0);
    expect(statuses.some((s) => s === 410), statuses.join()).toBe(true);
    expect((await request.get(`${API}/messages/${m.token}/meta`)).status()).toBe(404);
  });

  test('burning with the creator token in parallel: one success, the rest "not found"', async ({ request }) => {
    const m = await createMessage(request);
    const res = await parallel(8, () => request.delete(`${API}/messages/${m.token}`, { headers: { 'X-Creator-Token': m.creatorToken } }));
    const statuses = res.map((r) => r.status());
    expect(count(statuses, 200), statuses.join()).toBe(1);
    expect(statuses.filter((s) => s !== 200).every((s) => s === 404)).toBe(true);
  });
});

test.describe('Uniqueness under concurrency', () => {
  test('the same email signing up 6 times at once creates exactly one account (never a 500)', async ({ request }) => {
    const email = `race-${uniq()}@example.com`;
    const res = await parallel(6, () => request.post(`${API}/auth/signup`, { headers: { 'CF-Connecting-IP': randomIp() }, data: { email, password: PASSWORD } }));
    const statuses = res.map((r) => r.status());
    expect(statuses.every((s) => s < 500), statuses.join()).toBe(true);
    expect(count(statuses, 201), statuses.join()).toBe(1);
    expect(count(statuses, 409), statuses.join()).toBe(5);
    expect(d1(`SELECT COUNT(*) AS n FROM users WHERE email = '${email}'`, { json: true })[0].n).toBe(1);
  });

  test('claiming one custom URL with 6 simultaneous creations: one winner, no 500s', async ({ request }) => {
    const slug = `race-${Date.now().toString().slice(-9)}`;
    const make = async () => {
      const enc = { encryptedData: 'abc', iv: IV, salt: IV, expiresIn: 3600, customSlug: slug };
      return request.post(`${API}/messages`, { headers: { 'CF-Connecting-IP': randomIp() }, data: enc });
    };
    const statuses = (await parallel(6, make)).map((r) => r.status());
    expect(statuses.every((s) => s < 500), statuses.join()).toBe(true);
    expect(count(statuses, 201), statuses.join()).toBe(1);
    expect(d1(`SELECT COUNT(*) AS n FROM messages WHERE custom_slug = '${slug}'`, { json: true })[0].n).toBe(1);
  });
});

test.describe('Rate limits are exact under a burst (Durable Object)', () => {
  test('45 simultaneous requests against a limit of 30: exactly 30 are admitted', async ({ request }) => {
    const ip = randomIp();                                        // one client, one budget
    const res = await parallel(45, (i) => request.get(`${API}/messages/check-slug/burst-${i}`, { headers: { 'CF-Connecting-IP': ip } }));
    const statuses = res.map((r) => r.status());
    expect(count(statuses, 200), statuses.join()).toBe(30);
    expect(count(statuses, 429), statuses.join()).toBe(15);
    const limited = res.find((r) => r.status() === 429);
    expect(limited.headers()['x-ratelimit-remaining']).toBe('0');
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
  });

  test('the anonymous-token endpoint admits exactly its limit under a burst, and another client is unaffected', async ({ playwright, request }) => {
    const ip = randomIp();
    const bare = await playwright.request.newContext({ baseURL: 'http://localhost:8787', extraHTTPHeaders: { 'CF-Connecting-IP': ip } });
    const statuses = (await parallel(40, () => bare.post(`${API}/app-token`))).map((r) => r.status());
    expect(count(statuses, 200), statuses.join()).toBe(30);
    expect(count(statuses, 429), statuses.join()).toBe(10);
    await bare.dispose();
    const other = await playwright.request.newContext({ baseURL: 'http://localhost:8787', extraHTTPHeaders: { 'CF-Connecting-IP': randomIp() } });
    expect((await other.post(`${API}/app-token`)).status()).toBe(200);
    await other.dispose();
  });

  test('signup throttling cannot be beaten by parallel requests', async ({ request }) => {
    const ip = randomIp();
    const statuses = (await parallel(12, (i) => request.post(`${API}/auth/signup`, {
      headers: { 'CF-Connecting-IP': ip }, data: { email: `burst-${uniq()}-${i}@example.com`, password: PASSWORD },
    }))).map((r) => r.status());
    expect(count(statuses, 201), statuses.join()).toBe(5);       // limit is 5 per 10 minutes
    expect(count(statuses, 429), statuses.join()).toBe(7);
  });
});

test.describe('Billing idempotency', () => {
  const STRIPE_SECRET = 'dev-stripe-webhook-secret';
  const send = (request, event) => {
    const raw = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac('sha256', STRIPE_SECRET).update(`${ts}.${raw}`).digest('hex');
    return request.post(`${API}/premium/webhook`, { headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${ts},v1=${sig}` }, data: raw });
  };

  test('the same paid event delivered 5 times at once leaves exactly one active subscription', async ({ request }) => {
    const user = await newUser(request);
    const event = { type: 'checkout.session.completed', data: { object: { payment_status: 'paid', customer: 'cus_r', subscription: 'sub_r', metadata: { user_id: user.userId, plan_id: 'premium' } } } };
    const statuses = (await parallel(5, () => send(request, event))).map((r) => r.status());
    expect(statuses.every((s) => s === 200), statuses.join()).toBe(true);
    const active = d1(`SELECT COUNT(*) AS n FROM user_subscriptions WHERE user_id = '${user.userId}' AND status = 'active'`, { json: true })[0].n;
    expect(active).toBe(1);
    const status = await (await request.get(`${API}/premium/status`, { headers: user.headers })).json();
    expect(status.isPremium).toBe(true);
  });
});

test.describe('Secrets at rest', () => {
  test('session tokens, API keys and verification tokens are stored only as hashes', async ({ request }) => {
    const user = await newUser(request);
    const key = (await (await request.post(`${API}/api-keys`, { headers: user.headers, data: { name: 'h', rate_limit: 100 } })).json()).key;
    const sessions = d1(`SELECT session_token FROM sessions WHERE user_id = '${user.userId}'`, { json: true });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.map((s) => s.session_token)).toContain(sha256(user.token));
    expect(sessions.map((s) => s.session_token)).not.toContain(user.token);

    const keys = d1(`SELECT key FROM api_keys WHERE user_id = '${user.userId}'`, { json: true }).map((k) => k.key);
    expect(keys).toContain(sha256(key));
    expect(keys).not.toContain(key);

    const row = d1(`SELECT verification_token FROM users WHERE id = '${user.userId}'`, { json: true })[0];
    expect(row.verification_token).toMatch(/^[0-9a-f]{64}$/);

    const m = await createMessage(request);
    const msg = d1(`SELECT auth_hash, totp_secret FROM messages WHERE token = '${m.token}'`, { json: true })[0];
    expect(msg.auth_hash).toBe(sha256(m.authTag)); // the password proof itself is never stored
    expect(msg.auth_hash).not.toBe(m.authTag);
  });
});

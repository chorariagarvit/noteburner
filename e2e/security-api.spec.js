/**
 * Security API tests (server-enforced behaviour introduced in the security hardening work).
 *
 * These talk to the Worker directly and are browser independent, so they only run on the
 * `chromium` project. Every test gets its own client IP (see fixtures.js), so rate limits only
 * trip where a test deliberately exercises them.
 */
import { test, expect } from './fixtures.js';
import crypto from 'node:crypto';
import { encryptMessage, deriveAuthTag, decryptMessage } from '../frontend/src/utils/crypto.js';
import { generateTOTP } from '../backend/src/utils/totp.js';

const API = 'http://localhost:8787/api';
const IV = 'AAAAAAAAAAAAAAAAAAAAAA==';
const STRIPE_SECRET = 'dev-stripe-webhook-secret'; // matches backend `npm run dev`
const PASSWORD = 'Str0ng!Passw0rd#1';

test.describe.configure({ timeout: 90_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

// ---------------------------------------------------------------- helpers
// A fresh random address every call (never collides with the per-test IPs from fixtures.js)
const otherIp = () => {
  const b = crypto.randomBytes(3);
  return `172.${16 + (b[0] % 16)}.${b[1]}.${(b[2] % 253) + 1}`;
};
const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createMessage(request, { password = 'correct-horse-1', text = 'top secret', body = {}, tag = true } = {}) {
  const enc = await encryptMessage(text, password);
  const authTag = tag ? await deriveAuthTag(password, enc.salt) : undefined;
  const res = await request.post(`${API}/messages`, { data: { ...enc, expiresIn: 3600, authTag, ...body } });
  expect(res.status(), await res.text()).toBe(201);
  const json = await res.json();
  return { ...json, enc, authTag, password, text };
}

const get = (request, id, headers = {}) => request.get(`${API}/messages/${id}`, { headers });
const burn = (request, id, headers = {}) => request.delete(`${API}/messages/${id}`, { headers });

async function newUser(request) {
  const email = `sec-${uniq()}@example.com`;
  const signup = await request.post(`${API}/auth/signup`, { data: { email, password: PASSWORD } });
  expect(signup.status(), await signup.text()).toBe(201);
  const login = await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(login.status()).toBe(200);
  const body = await login.json();
  return { email, userId: body.user.id, token: body.sessionToken, headers: { 'X-Session-Token': body.sessionToken } };
}

async function bareContext(playwright) {
  // No default X-App-Token / client IP: exercises "unauthenticated" behaviour
  return playwright.request.newContext({ baseURL: 'http://localhost:8787', extraHTTPHeaders: { 'CF-Connecting-IP': otherIp() } });
}

// ---------------------------------------------------------------- one-time access
test.describe('One-time access is enforced by the server', () => {
  test('meta exposes salt/protections but never ciphertext or secrets', async ({ request }) => {
    const m = await createMessage(request);
    const res = await request.get(`${API}/messages/${m.token}/meta`);
    expect(res.status()).toBe(200);
    const meta = await res.json();
    expect(meta.salt).toBe(m.enc.salt);
    expect(meta.authRequired).toBe(true);
    expect(meta.totpRequired).toBe(false);
    expect(JSON.stringify(meta)).not.toMatch(/encryptedData|auth_hash|totp_secret|creator/i);
  });

  test('without the password proof the ciphertext is never released', async ({ request }) => {
    const m = await createMessage(request);
    const res = await get(request, m.token);
    expect(res.status()).toBe(401);
    expect((await res.json()).code).toBe('AUTH_TAG_REQUIRED');
    // a missing tag is NOT a password guess: it must not burn the message
    for (let i = 0; i < 5; i++) expect((await get(request, m.token)).status()).toBe(401);
    expect((await get(request, m.token, { 'X-Auth-Tag': m.authTag })).status()).toBe(200);
  });

  test('correct proof releases it exactly once; a re-fetch finds it destroyed', async ({ request }) => {
    const m = await createMessage(request);
    const ok = await get(request, m.token, { 'X-Auth-Tag': m.authTag });
    expect(ok.status()).toBe(200);
    const data = await ok.json();
    expect(data.viewsRemaining).toBe(0);
    expect(await decryptMessage(data.encryptedData, data.iv, data.salt, m.password)).toBe(m.text);
    const again = await get(request, m.token, { 'X-Auth-Tag': m.authTag });
    expect(again.status()).toBe(410);
    expect((await again.json()).code).toBe('ALREADY_VIEWED');
    expect((await get(request, m.token, { 'X-Auth-Tag': m.authTag })).status()).toBe(404);
  });

  test('wrong passwords count down and burn the message at the limit', async ({ request }) => {
    const m = await createMessage(request, { body: { maxPasswordAttempts: 3 } });
    const bad = { 'X-Auth-Tag': Buffer.alloc(32, 7).toString('base64') };
    const r1 = await get(request, m.token, bad);
    expect(r1.status()).toBe(401);
    expect((await r1.json()).error).toContain('2 attempt(s) remaining');
    expect((await (await get(request, m.token, bad)).json()).error).toContain('1 attempt(s) remaining');
    const r3 = await get(request, m.token, bad);
    expect(r3.status()).toBe(410);
    expect((await r3.json()).code).toBe('BURNED_ATTEMPTS');
    // even the right password is too late
    expect((await get(request, m.token, { 'X-Auth-Tag': m.authTag })).status()).toBe(404);
  });

  test('holding only the link cannot burn a message', async ({ request }) => {
    const m = await createMessage(request);
    expect((await burn(request, m.token)).status()).toBe(401);
    expect((await burn(request, m.token, { 'X-Auth-Tag': Buffer.alloc(32, 1).toString('base64') })).status()).toBe(401);
    expect((await burn(request, m.token, { 'X-Creator-Token': 'not-the-creator-token' })).status()).toBe(403);
    expect((await get(request, m.token, { 'X-Auth-Tag': m.authTag })).status()).toBe(200); // still alive
  });

  test('the recipient (auth tag) and the creator (token) can burn', async ({ request }) => {
    const a = await createMessage(request);
    expect((await burn(request, a.token, { 'X-Auth-Tag': a.authTag })).status()).toBe(200);
    expect((await get(request, a.token, { 'X-Auth-Tag': a.authTag })).status()).toBe(404);

    const b = await createMessage(request);
    expect((await burn(request, b.token, { 'X-Creator-Token': b.creatorToken })).status()).toBe(200);
    expect((await get(request, b.token, { 'X-Auth-Tag': b.authTag })).status()).toBe(404);
  });

  test('max views > 1: views count down and the last one tells the client to burn', async ({ request }) => {
    const m = await createMessage(request, { body: { maxViews: 2 } });
    const h = { 'X-Auth-Tag': m.authTag };
    const first = await (await get(request, m.token, h)).json();
    expect(first.viewsRemaining).toBe(1);
    const second = await (await get(request, m.token, h)).json();
    expect(second.viewsRemaining).toBe(0);
    expect((await get(request, m.token, h)).status()).toBe(410);
  });

  test('"unlimited" views and attempts (-1) are honoured, not clamped to 1', async ({ request }) => {
    const m = await createMessage(request, { body: { maxViews: -1, maxPasswordAttempts: -1 } });
    const bad = { 'X-Auth-Tag': Buffer.alloc(32, 9).toString('base64') };
    for (let i = 0; i < 12; i++) {
      const r = await get(request, m.token, bad);
      expect(r.status()).toBe(401); // never burns however many wrong guesses
      expect((await r.json()).error).toBe('Incorrect password.');
    }
    for (let i = 0; i < 4; i++) {
      const r = await get(request, m.token, { 'X-Auth-Tag': m.authTag });
      expect(r.status()).toBe(200);
      expect((await r.json()).viewsRemaining).toBeNull();
    }
  });

  test('messages without a password proof (legacy/group) still get the single-view limit', async ({ request }) => {
    const m = await createMessage(request, { tag: false });
    expect((await request.get(`${API}/messages/${m.token}/meta`).then((r) => r.json())).authRequired).toBe(false);
    expect((await get(request, m.token)).status()).toBe(200);
    expect((await get(request, m.token)).status()).toBe(410);
  });

  test('input validation rejects bad expiry, sizes, ids and tags', async ({ request }) => {
    const enc = await encryptMessage('x', 'pw-pw-pw-pw');
    const post = (data) => request.post(`${API}/messages`, { data });
    for (const expiresIn of [-5, 0, 'abc', 31 * 24 * 3600]) {
      expect((await post({ ...enc, expiresIn })).status(), `expiresIn=${expiresIn}`).toBe(400);
    }
    expect((await post({ ...enc, iv: 'short' })).status()).toBe(400);
    expect((await post({ ...enc, salt: 'short' })).status()).toBe(400);
    expect((await post({ ...enc, authTag: 'too-short' })).status()).toBe(400);
    expect((await post({ encryptedData: 'abc' })).status()).toBe(400);
    expect((await post({ ...enc, encryptedData: 'A'.repeat(1.5 * 1024 * 1024) })).status()).toBe(413);
    expect((await post({ ...enc, encryptedData: { not: 'a string' } })).status()).toBe(400);
  });
});

// ---------------------------------------------------------------- 2FA
test.describe('2FA (TOTP) is enforced by the server', () => {
  test('needs a valid code, and the proof is bound to its message', async ({ request }) => {
    const a = await createMessage(request, { body: { require2FA: 1 } });
    const b = await createMessage(request, { body: { require2FA: 1 } });
    expect(a.totp.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(a.totp.uri).toMatch(/^otpauth:\/\/totp\//);

    // password proof alone only returns metadata
    const meta = await (await get(request, a.token, { 'X-Auth-Tag': a.authTag })).json();
    expect(meta.totpRequired).toBe(true);
    expect(meta.encryptedData).toBeUndefined();

    const wrong = await request.post(`${API}/messages/${a.token}/verify-totp`, { data: { code: '000000' } });
    expect(wrong.status()).toBe(401);

    const verify = (m, secret) => request.post(`${API}/messages/${m.token}/verify-totp`, { data: { code: generateTOTP(secret) } });
    const okA = await verify(a, a.totp.secret);
    expect(okA.status()).toBe(200);
    const proofA = (await okA.json()).proof;
    expect(proofA).toBeTruthy();

    // proof for A is useless for B
    const bData = await (await get(request, b.token, { 'X-Auth-Tag': b.authTag, 'X-TOTP-Proof': proofA })).json();
    expect(bData.encryptedData).toBeUndefined();

    // burning needs the proof too
    expect((await burn(request, a.token, { 'X-Auth-Tag': a.authTag })).status()).toBe(403);

    const full = await get(request, a.token, { 'X-Auth-Tag': a.authTag, 'X-TOTP-Proof': proofA });
    expect(full.status()).toBe(200);
    const fullData = await full.json();
    expect(await decryptMessage(fullData.encryptedData, fullData.iv, fullData.salt, a.password)).toBe(a.text);
  });

  test('guessing codes from many IPs still burns the message after 10 attempts', async ({ request }) => {
    const m = await createMessage(request, { body: { require2FA: 1 } });
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request.post(`${API}/messages/${m.token}/verify-totp`, {
        headers: { 'CF-Connecting-IP': otherIp() }, // defeats the per-IP limit on purpose
        data: { code: String(100000 + i) },
      });
    }
    expect(last.status()).toBe(410);
    expect((await last.json()).code).toBe('BURNED_2FA');
    expect((await get(request, m.token, { 'X-Auth-Tag': m.authTag })).status()).toBe(404);
  });

  test('per-IP limit stops fast guessing from one address', async ({ request }) => {
    const m = await createMessage(request, { body: { require2FA: 1 } });
    const statuses = [];
    for (let i = 0; i < 8; i++) {
      statuses.push((await request.post(`${API}/messages/${m.token}/verify-totp`, { data: { code: String(200000 + i) } })).status());
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses.slice(5)).toContain(429);
  });

  test('verify-totp validates its input and rejects non-2FA messages', async ({ request }) => {
    const plain = await createMessage(request);
    const tfa = await createMessage(request, { body: { require2FA: 1 } });
    const post = (id, data) => request.post(`${API}/messages/${id}/verify-totp`, { data });
    expect((await post(plain.token, { code: '123456' })).status()).toBe(400);
    expect((await post(tfa.token, { code: 'abcdef' })).status()).toBe(400);
    expect((await post(tfa.token, {})).status()).toBe(400);
    expect((await post('does-not-exist', { code: '123456' })).status()).toBe(404);
  });
});

// ---------------------------------------------------------------- API gate
test.describe('Every API call needs credentials', () => {
  test('anonymous requests are refused; the public allowlist stays open', async ({ playwright }) => {
    const bare = await bareContext(playwright);
    for (const [method, path] of [['GET', '/stats'], ['GET', '/messages/abc/meta'], ['GET', '/media/abc'], ['GET', '/health/deep'],
      ['GET', '/audit/abc'], ['GET', '/premium/plans'], ['GET', '/teams'], ['POST', '/messages']]) {
      const res = await bare.fetch(`${API}${path}`, { method });
      expect(res.status(), `${method} ${path}`).toBe(401);
      expect((await res.json()).code).toBe('AUTH_REQUIRED');
    }
    expect((await bare.get(`${API}/health/ping`)).status()).toBe(200);
    expect((await bare.get(`${API}/health`)).status()).toBe(200);
    expect((await bare.post(`${API}/auth/login`, { data: {} })).status()).toBe(400); // reachable, validates input
    await bare.dispose();
  });

  test('app tokens: issued on demand, verified, and expiry/tampering rejected', async ({ playwright }) => {
    const bare = await bareContext(playwright);
    const issued = await bare.post(`${API}/app-token`);
    expect(issued.status()).toBe(200);
    const { token, expiresAt } = await issued.json();
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect((await bare.get(`${API}/stats`, { headers: { 'X-App-Token': token } })).status()).toBe(200);

    const [payload, mac] = token.split('.');
    const bad = async (t) => {
      const r = await bare.get(`${API}/stats`, { headers: { 'X-App-Token': t } });
      expect(r.status()).toBe(401);
      expect((await r.json()).code).toBe('APP_TOKEN_INVALID');
    };
    await bad(`${payload}.${'0'.repeat(mac.length)}`);                    // wrong signature
    await bad(`${Buffer.from(JSON.stringify({ exp: Date.now() + 1e9, n: 'x' })).toString('base64url')}.${mac}`); // forged payload
    const expiredPayload = Buffer.from(JSON.stringify({ exp: Date.now() - 1000, n: 'x' })).toString('base64url');
    const expiredMac = crypto.createHmac('sha256', 'dev-app-token-secret').update(expiredPayload).digest('hex');
    await bad(`${expiredPayload}.${expiredMac}`);                          // correctly signed but expired
    await bad('not-a-token');
    await bare.dispose();
  });

  test('the token endpoint is rate limited per IP and reports it', async ({ playwright }) => {
    const bare = await bareContext(playwright);
    let limited;
    for (let i = 0; i < 33 && !limited; i++) {
      const r = await bare.post(`${API}/app-token`);
      if (r.status() === 429) limited = r;
    }
    expect(limited, 'expected a 429 within 33 requests').toBeTruthy();
    expect(limited.headers()['x-ratelimit-remaining']).toBe('0');
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    // another client is unaffected
    const other = await bareContext(playwright);
    expect((await other.post(`${API}/app-token`)).status()).toBe(200);
    await bare.dispose(); await other.dispose();
  });

  test('a session or an API key works without an app token', async ({ playwright, request }) => {
    const user = await newUser(request);
    const bare = await bareContext(playwright);
    expect((await bare.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(200);
    expect((await bare.get(`${API}/auth/me`, { headers: { 'X-Session-Token': 'x'.repeat(48) } })).status()).toBe(401);
    await bare.dispose();
  });
});

// ---------------------------------------------------------------- rate limiting & CORS
test.describe('Rate limiting and CORS', () => {
  test('message creation: headers on success, 429 + Retry-After at the limit, other IPs unaffected', async ({ request }) => {
    const quick = (headers) => request.post(`${API}/messages`, { headers, data: { encryptedData: 'abc', iv: IV, salt: IV, expiresIn: 3600 } });
    const first = await quick({});
    expect(first.status()).toBe(201);
    expect(first.headers()['x-ratelimit-limit']).toBe('10');
    expect(Number(first.headers()['x-ratelimit-remaining'])).toBe(9);
    expect(Number(first.headers()['x-ratelimit-reset'])).toBeGreaterThan(Date.now() / 1000);

    let limited;
    for (let i = 0; i < 12 && !limited; i++) { const r = await quick({}); if (r.status() === 429) limited = r; }
    expect(limited, 'no 429 after 12 creations').toBeTruthy();
    expect(limited.headers()['x-ratelimit-remaining']).toBe('0');
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    expect((await quick({ 'CF-Connecting-IP': otherIp() })).status()).toBe(201);
  });

  test('check-slug is rate limited', async ({ request }) => {
    const statuses = [];
    for (let i = 0; i < 33; i++) statuses.push((await request.get(`${API}/messages/check-slug/probe-${i}`)).status());
    expect(statuses[0]).toBe(200);
    expect(statuses).toContain(429);
  });

  test('CORS: evil origins get no CORS headers, app origins and custom auth headers are allowed', async ({ request }) => {
    const preflight = (origin) => request.fetch(`${API}/messages`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-auth-tag,x-app-token,content-type' },
    });
    const evil = await preflight('https://evil.example');
    expect(evil.headers()['access-control-allow-origin']).toBeUndefined();
    const ok = await preflight('http://localhost:5173');
    expect(ok.headers()['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers()['access-control-allow-headers'].toLowerCase()).toContain('x-auth-tag');
    const ext = await preflight('chrome-extension://abcdefghijklmnop');
    expect(ext.headers()['access-control-allow-origin']).toBe('chrome-extension://abcdefghijklmnop');
  });

  test('API responses carry security headers and never leak stack traces', async ({ request }) => {
    const res = await request.get(`${API}/stats`);
    expect(res.headers()['x-frame-options']).toBeTruthy();
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    const notFound = await request.get(`${API}/does/not/exist`);
    expect(notFound.status()).toBe(404);
    expect(await notFound.text()).not.toMatch(/at \w+ \(|node_modules|\.js:\d+/);
  });
});

// ---------------------------------------------------------------- accounts & sessions
test.describe('Accounts and sessions', () => {
  test('sessions list shows opaque ids only, and revocation is immediate', async ({ request }) => {
    const user = await newUser(request);
    const second = await request.post(`${API}/auth/login`, { data: { email: user.email, password: PASSWORD } });
    const secondToken = (await second.json()).sessionToken;

    const list = await request.get(`${API}/auth/sessions`, { headers: user.headers });
    const { sessions } = await list.json();
    expect(sessions.length).toBe(2);
    for (const s of sessions) expect(s.id).toMatch(/^[0-9a-f]{16}$/);
    const raw = JSON.stringify(sessions);
    expect(raw).not.toContain(user.token);
    expect(raw).not.toContain(secondToken);
    expect(raw).not.toMatch(/sessionToken|session_token/);

    // revoking one session by id kills exactly that session immediately; the other keeps working
    const revoke = await request.delete(`${API}/auth/sessions/${sessions[0].id}`, { headers: user.headers });
    expect(revoke.status()).toBe(200);
    const statuses = [
      (await request.get(`${API}/auth/me`, { headers: user.headers })).status(),
      (await request.get(`${API}/auth/me`, { headers: { 'X-Session-Token': secondToken } })).status(),
    ].sort();
    expect(statuses).toEqual([200, 401]);
  });

  test('"log out all devices" invalidates every token immediately (no cache lag)', async ({ request }) => {
    const user = await newUser(request);
    const second = (await (await request.post(`${API}/auth/login`, { data: { email: user.email, password: PASSWORD } })).json()).sessionToken;
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(200);
    expect((await request.get(`${API}/auth/me`, { headers: { 'X-Session-Token': second } })).status()).toBe(200);
    expect((await request.delete(`${API}/auth/sessions`, { headers: user.headers })).status()).toBe(200);
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(401);
    expect((await request.get(`${API}/auth/me`, { headers: { 'X-Session-Token': second } })).status()).toBe(401);
  });

  test('login does not reveal which accounts exist or are locked', async ({ request }) => {
    const user = await newUser(request);
    const attempt = (email, password) => request.post(`${API}/auth/login`, { data: { email, password } });
    const unknown = await attempt(`nobody-${uniq()}@example.com`, 'whatever-123');
    const unknownBody = await unknown.json();
    expect(unknown.status()).toBe(401);

    for (let i = 0; i < 5; i++) expect((await attempt(user.email, `wrong-${i}`)).status()).toBe(401);
    const locked = await attempt(user.email, PASSWORD); // correct password, but account is locked
    expect(locked.status()).toBe(401);
    expect(await locked.json()).toEqual(unknownBody); // identical response: no 423 / "locked" signal
  });

  test('login and signup are throttled per IP', async ({ request }) => {
    const logins = [];
    for (let i = 0; i < 12; i++) logins.push((await request.post(`${API}/auth/login`, { data: { email: `x${i}@example.com`, password: 'nope-nope-1' } })).status());
    expect(logins).toContain(429);
    const signups = [];
    for (let i = 0; i < 7; i++) signups.push((await request.post(`${API}/auth/signup`, { data: { email: `thr-${uniq()}-${i}@example.com`, password: PASSWORD } })).status());
    expect(signups).toContain(429);
  });

  test('display names are sanitized and hostile input never causes a 500', async ({ request }) => {
    const email = `name-${uniq()}@example.com`;
    const signup = await request.post(`${API}/auth/signup`, { data: { email, password: PASSWORD, displayName: '<img src=x onerror=alert(1)>Eve' + 'x'.repeat(200) } });
    expect(signup.status()).toBe(201);
    const login = await (await request.post(`${API}/auth/login`, { data: { email, password: PASSWORD } })).json();
    const me = await (await request.get(`${API}/auth/me`, { headers: { 'X-Session-Token': login.sessionToken } })).json();
    expect(me.user.displayName).not.toMatch(/[<>]/);
    expect(me.user.displayName.length).toBeLessThanOrEqual(80);

    for (const evil of ["' OR '1'='1", 'a@b.co"; DROP TABLE users;--', '\u0000@x.co']) {
      const r = await request.post(`${API}/auth/login`, { data: { email: evil, password: 'x'.repeat(10) } });
      expect(r.status(), evil).toBeLessThan(500);
    }
    const weak = await request.post(`${API}/auth/signup`, { data: { email: `weak-${uniq()}@example.com`, password: 'short' } });
    expect(weak.status()).toBe(400);
    // a duplicate signup is indistinguishable from a first one (no "already registered" oracle)
    const dupe = await request.post(`${API}/auth/signup`, { data: { email, password: PASSWORD } });
    expect(dupe.status()).toBe(201);
  });
});

// ---------------------------------------------------------------- API keys
test.describe('API keys', () => {
  test('keys are shown once, stored hashed, work for the public API, and can be revoked', async ({ request, playwright }) => {
    const user = await newUser(request);
    const created = await request.post(`${API}/api-keys`, { headers: user.headers, data: { name: 'ci', rate_limit: 1000 } });
    expect(created.status()).toBe(201);
    const { key, api_key } = await created.json();
    expect(key).toMatch(/^nb_/);

    const list = await (await request.get(`${API}/api-keys`, { headers: user.headers })).json();
    expect(JSON.stringify(list)).not.toContain(key);

    const bare = await bareContext(playwright);
    const withKey = (path) => bare.get(`${API}${path}`, { headers: { 'X-API-Key': key } });
    expect((await withKey('/v1/messages')).status()).toBe(200);
    expect((await withKey('/integrations/zapier/auth')).status()).toBe(200);
    expect((await bare.get(`${API}/v1/messages`, { headers: { 'X-API-Key': `${key}x` } })).status()).toBe(401);

    // a key cannot mint more keys (privilege escalation), nor via the removed endpoint
    expect((await bare.post(`${API}/v1/api-keys`, { headers: { 'X-API-Key': key }, data: { name: 'child', rate_limit: 1e12 } })).status()).toBe(404);
    expect((await bare.post(`${API}/integrations/keys/create`, { headers: { 'X-API-Key': key }, data: { user_id: 'x', name: 'x' } })).status()).toBe(404);

    expect((await request.delete(`${API}/api-keys/${api_key.id}`, { headers: user.headers })).status()).toBe(200);
    expect((await withKey('/v1/messages')).status()).toBe(401); // revoked keys stop working at once
    await bare.dispose();
  });

  test('keys are per-user: nobody else can revoke them, and creating one needs a login', async ({ request }) => {
    const owner = await newUser(request);
    const intruder = await newUser(request);
    const { api_key } = await (await request.post(`${API}/api-keys`, { headers: owner.headers, data: { name: 'mine', rate_limit: 100 } })).json();
    expect((await request.delete(`${API}/api-keys/${api_key.id}`, { headers: intruder.headers })).status()).toBe(404);
    expect((await request.post(`${API}/api-keys`, { data: { name: 'anon' } })).status()).toBe(401);
    expect((await request.post(`${API}/api-keys`, { headers: owner.headers, data: { name: 'big', rate_limit: 999999999 } })).status()).toBe(400);
    expect((await request.post(`${API}/api-keys`, { headers: owner.headers, data: { rate_limit: 100 } })).status()).toBe(400);
  });

  test('server-side message creators in integrations are disabled; Slack needs a signature', async ({ request }) => {
    for (const path of ['/integrations/zapier/create', '/integrations/discord/create']) {
      expect((await request.post(`${API}${path}`, { data: { message: 'x' } })).status(), path).toBe(501);
    }
    const slack = await request.post(`${API}/integrations/slack/command`, { form: { text: 'hi', token: 'whatever' } });
    expect(slack.status()).toBe(401);
    const private_ = await newUser(request).then(async (u) => {
      const { key } = await (await request.post(`${API}/api-keys`, { headers: u.headers, data: { name: 'wh', rate_limit: 100 } })).json();
      return key;
    });
    for (const url of ['https://localhost/hook', 'https://127.0.0.1/hook', 'https://10.0.0.5/hook', 'https://192.168.1.1/hook', 'http://example.com/hook']) {
      const r = await request.post(`${API}/integrations/webhooks/subscribe`, { headers: { 'X-API-Key': private_ }, data: { webhook_url: url, events: ['message.burned'] } });
      expect(r.status(), url).toBe(400);
    }
    const good = await request.post(`${API}/integrations/webhooks/subscribe`, { headers: { 'X-API-Key': private_ }, data: { webhook_url: 'https://hooks.example.com/ok', events: ['message.burned'] } });
    expect(good.status()).toBe(200);
  });
});

// ---------------------------------------------------------------- billing
test.describe('Premium plans cannot be self-granted', () => {
  const webhook = (request, event, { secret = STRIPE_SECRET, ts = Math.floor(Date.now() / 1000) } = {}) => {
    const raw = JSON.stringify(event);
    const sig = crypto.createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
    return request.post(`${API}/premium/webhook`, { headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${ts},v1=${sig}` }, data: raw });
  };
  const paid = (userId, plan = 'lifetime', extra = {}) => ({
    type: 'checkout.session.completed',
    data: { object: { payment_status: 'paid', customer: 'cus_test', subscription: 'sub_test', metadata: { user_id: userId, plan_id: plan }, ...extra } },
  });

  test('the client-facing subscribe endpoint never grants a plan', async ({ request }) => {
    const user = await newUser(request);
    for (const planId of ['premium', 'lifetime']) {
      const r = await request.post(`${API}/premium/subscribe`, { headers: user.headers, data: { planId, paymentMethod: 'manual' } });
      expect(r.status()).toBe(501);
      expect((await r.json()).code).toBe('PAYMENTS_NOT_ENABLED');
    }
    const status = await (await request.get(`${API}/premium/status`, { headers: user.headers })).json();
    expect(status.isPremium).toBe(false);
  });

  test('webhook: bad/missing/stale signatures are rejected; a valid paid event grants the plan', async ({ request }) => {
    const user = await newUser(request);
    const event = paid(user.userId);
    expect((await request.post(`${API}/premium/webhook`, { data: event })).status()).toBe(401);          // unsigned
    expect((await webhook(request, event, { secret: 'wrong-secret' })).status()).toBe(401);                 // wrong key
    expect((await webhook(request, event, { ts: Math.floor(Date.now() / 1000) - 3600 })).status()).toBe(401); // replay
    expect((await (await request.get(`${API}/premium/status`, { headers: user.headers })).json()).isPremium).toBe(false);

    const ok = await webhook(request, event);
    expect(ok.status()).toBe(200);
    const after = await (await request.get(`${API}/premium/status`, { headers: user.headers })).json();
    expect(after.isPremium).toBe(true);
    expect(after.plan.id).toBe('lifetime');
    expect(after.subscription.plan_id).toBe('lifetime');
  });

  test('webhook ignores unpaid sessions, unknown users, unknown plans and other event types', async ({ request }) => {
    const user = await newUser(request);
    const ignored = [
      paid(user.userId, 'lifetime', { payment_status: 'unpaid' }),
      paid('no-such-user'),
      paid(user.userId, 'enterprise-forever'),
      paid(user.userId, 'free'),
      { type: 'customer.created', data: { object: {} } },
    ];
    for (const e of ignored) expect((await webhook(request, e)).status()).toBe(200);
    expect((await (await request.get(`${API}/premium/status`, { headers: user.headers })).json()).isPremium).toBe(false);
  });
});

// ---------------------------------------------------------------- teams
test.describe('Teams: plans and roles', () => {
  const memberRow = async (request, headers, teamId, email) =>
    (await (await request.get(`${API}/teams/${teamId}/members`, { headers })).json()).members.find((m) => m.email === email);

  test('a team always starts on the free plan, whatever the client asks for', async ({ request }) => {
    const owner = await newUser(request);
    const res = await request.post(`${API}/teams`, { headers: owner.headers, data: { name: 'Sneaky Team', plan: 'enterprise' } });
    expect(res.status()).toBe(201);
    const { team } = await res.json();
    const teams = await (await request.get(`${API}/teams`, { headers: owner.headers })).json();
    const mine = teams.teams.find((t) => t.id === team.id);
    expect(mine.plan).toBe('free');
    // and paid-only branding is refused on a free team
    const branding = await request.put(`${API}/branding/${team.id}`, { headers: owner.headers, data: { primary_color: '#ff0000' } });
    expect(branding.status()).toBe(403);
    expect((await branding.json()).code).toBe('UPGRADE_REQUIRED');
  });

  test('inviting never reveals whether an email has an account', async ({ request }) => {
    const owner = await newUser(request);
    const { team } = await (await request.post(`${API}/teams`, { headers: owner.headers, data: { name: 'Invite Team' } })).json();
    const ghost = `ghost-${uniq()}@example.com`;
    const real = await newUser(request);
    const a = await request.post(`${API}/teams/${team.id}/members`, { headers: owner.headers, data: { email: ghost, role: 'member' } });
    const b = await request.post(`${API}/teams/${team.id}/members`, { headers: owner.headers, data: { email: real.email, role: 'member' } });
    expect([a.status(), b.status()]).toEqual([201, 201]);
    expect(await memberRow(request, owner.headers, team.id, ghost)).toBeUndefined();
    expect(await memberRow(request, owner.headers, team.id, real.email)).toBeTruthy();
    expect((await request.post(`${API}/teams/${team.id}/members`, { headers: owner.headers, data: { email: real.email, role: 'superuser' } })).status()).toBe(400);
  });

  test('roles: the owner is untouchable and only the owner manages admins', async ({ request }) => {
    const owner = await newUser(request);
    const admin1 = await newUser(request);
    const admin2 = await newUser(request);
    const member = await newUser(request);
    const { team } = await (await request.post(`${API}/teams`, { headers: owner.headers, data: { name: 'Roles Team' } })).json();
    for (const [u, role] of [[admin1, 'admin'], [admin2, 'admin'], [member, 'member']]) {
      expect((await request.post(`${API}/teams/${team.id}/members`, { headers: owner.headers, data: { email: u.email, role } })).status()).toBe(201);
    }
    const ownerRow = await memberRow(request, owner.headers, team.id, owner.email);
    const admin2Row = await memberRow(request, owner.headers, team.id, admin2.email);
    const memberRow_ = await memberRow(request, owner.headers, team.id, member.email);
    const put = (headers, row, role) => request.put(`${API}/teams/${team.id}/members/${row.id}`, { headers, data: { role } });
    const del = (headers, row) => request.delete(`${API}/teams/${team.id}/members/${row.id}`, { headers });

    expect((await put(admin1.headers, ownerRow, 'viewer')).status()).toBe(403);   // can't demote the owner
    expect((await del(admin1.headers, ownerRow)).status()).toBeGreaterThanOrEqual(400); // can't remove the owner
    expect((await put(admin1.headers, admin2Row, 'viewer')).status()).toBe(403);  // admins can't demote admins
    expect((await del(admin1.headers, admin2Row)).status()).toBe(403);            // ...or remove them
    expect((await put(admin1.headers, memberRow_, 'admin')).status()).toBe(403);  // only the owner grants admin
    expect((await put(owner.headers, memberRow_, 'admin')).status()).toBe(200);   // the owner can
    expect((await put(owner.headers, ownerRow, 'viewer')).status()).toBe(403);    // not even the owner demotes themselves
    expect((await put(owner.headers, memberRow_, 'wizard')).status()).toBe(400);
  });

  test('outsiders and plain members cannot manage a team', async ({ request }) => {
    const owner = await newUser(request);
    const outsider = await newUser(request);
    const member = await newUser(request);
    const { team } = await (await request.post(`${API}/teams`, { headers: owner.headers, data: { name: 'Private Team' } })).json();
    await request.post(`${API}/teams/${team.id}/members`, { headers: owner.headers, data: { email: member.email, role: 'member' } });
    expect((await request.get(`${API}/teams/${team.id}`, { headers: outsider.headers })).status()).toBeGreaterThanOrEqual(403);
    expect((await request.get(`${API}/teams/${team.id}/members`, { headers: outsider.headers })).status()).toBeGreaterThanOrEqual(403);
    expect((await request.post(`${API}/teams/${team.id}/members`, { headers: member.headers, data: { email: outsider.email, role: 'member' } })).status()).toBe(403);
    expect((await request.delete(`${API}/teams/${team.id}`, { headers: member.headers })).status()).toBeGreaterThanOrEqual(403);
  });
});

// ---------------------------------------------------------------- uploads
test.describe('File uploads are creator-only', () => {
  const upload = (request, token, headers = {}) => request.post(`${API}/media`, {
    headers,
    data: { fileData: Buffer.from('encrypted-bytes').toString('base64'), fileName: 'a.bin', fileType: 'application/octet-stream', iv: IV, salt: IV, token },
  });

  test('only the creator can attach files, and only to a live message', async ({ request }) => {
    const m = await createMessage(request);
    expect((await upload(request, m.token)).status()).toBe(403);                                    // link alone
    expect((await upload(request, m.token, { 'X-Creator-Token': 'wrong' })).status()).toBe(403);
    expect((await upload(request, 'x'.repeat(32), { 'X-Creator-Token': m.creatorToken })).status()).toBe(403); // unknown message
    const ok = await upload(request, m.token, { 'X-Creator-Token': m.creatorToken });
    expect(ok.status()).toBe(201);
    const { fileId } = await ok.json();
    expect((await request.get(`${API}/media/${fileId}`)).status()).toBe(200);

    expect((await burn(request, m.token, { 'X-Creator-Token': m.creatorToken })).status()).toBe(200);
    expect((await upload(request, m.token, { 'X-Creator-Token': m.creatorToken })).status()).toBe(403); // burned message
  });

  test('a file id alone cannot delete a file; only files of a burned message can be confirmed', async ({ request }) => {
    const m = await createMessage(request);
    const { fileId } = await (await upload(request, m.token, { 'X-Creator-Token': m.creatorToken })).json();

    // message still live: anyone holding the id (e.g. a link scanner) cannot destroy the attachment
    expect((await request.delete(`${API}/media/${fileId}`)).status()).toBe(404);
    expect((await request.get(`${API}/media/${fileId}`)).status()).toBe(200);
    expect((await request.delete(`${API}/media/${'z'.repeat(32)}`)).status()).toBe(404); // unknown id

    // the reader burns the message, then confirms the download
    expect((await burn(request, m.token, { 'X-Creator-Token': m.creatorToken })).status()).toBe(200);
    expect((await request.delete(`${API}/media/${fileId}`)).status()).toBe(200);
    expect((await request.get(`${API}/media/${fileId}`)).status()).toBe(404);
  });

  test('multipart endpoints enforce the same rule and sane limits', async ({ request }) => {
    const m = await createMessage(request);
    const asCreator = { 'X-Creator-Token': m.creatorToken };
    const init = (headers, extra = {}) => request.post(`${API}/media/init`, { headers, data: { fileName: 'big.bin', fileType: 'x/y', fileSize: 1024, iv: IV, salt: IV, token: m.token, ...extra } });
    expect((await init({})).status()).toBe(403);
    expect((await init(asCreator, { fileSize: 3 * 1024 ** 3 })).status()).toBe(400);
    expect((await init(asCreator, { fileSize: -1 })).status()).toBe(400);

    const chunk = (headers, extra) => request.post(`${API}/media/chunk`, { headers, data: { fileId: 'f'.repeat(32), uploadId: 'u', chunkIndex: 0, chunkData: 'AA==', token: m.token, ...extra } });
    expect((await chunk({}, {})).status()).toBe(403);
    expect((await chunk(asCreator, { chunkIndex: 100000 })).status()).toBe(400);
    expect((await chunk(asCreator, { chunkIndex: -1 })).status()).toBe(400);

    const complete = (headers, parts) => request.post(`${API}/media/complete`, { headers, data: { fileId: 'f'.repeat(32), uploadId: 'u', parts, fileName: 'x', token: m.token } });
    expect((await complete({}, [{ partNumber: 1, etag: 'e' }])).status()).toBe(403);
    expect((await complete(asCreator, [])).status()).toBe(400);
    expect((await complete(asCreator, Array.from({ length: 500 }, (_, i) => ({ partNumber: i + 1, etag: 'e' })))).status()).toBe(400);
  });
});

// ---------------------------------------------------------------- audit log
test.describe('Audit log', () => {
  test('is only visible to the creator, looked up by message token', async ({ request }) => {
    const m = await createMessage(request);
    expect((await request.get(`${API}/audit/${m.token}`)).status()).toBe(401);
    expect((await request.get(`${API}/audit/${m.token}`, { headers: { 'X-Creator-Token': 'nope' } })).status()).toBe(404);
    const ok = await request.get(`${API}/audit/${m.token}`, { headers: { 'X-Creator-Token': m.creatorToken } });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(JSON.stringify(body)).not.toMatch(/creator_token|totp|auth_hash/);
  });
});

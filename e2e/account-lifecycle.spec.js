/**
 * Account lifecycle: password reset, email verification, profile, logout/refresh and account
 * deletion. Reset/verification tokens only exist inside e-mails (not sent in local dev), so the
 * tests seed known token HASHES straight into the local test database, exactly as the API stores
 * them. API only, so Chromium only.
 */
import { test, expect } from './fixtures.js';
import { API, PASSWORD, newUser, newApiKey, bareContext, d1, sha256, uniq } from './api-helpers.js';

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';
const NEW_PASSWORD = 'An0ther!Str0ngPass#2';

const seedReset = (userId, token, expires = FUTURE) =>
  d1(`INSERT INTO password_resets (id, user_id, reset_token, expires_at) VALUES ('r-${uniq()}', '${userId}', '${sha256(token)}', '${expires}')`);
const newToken = () => `reset-${uniq()}-${Math.random().toString(36).slice(2)}`;
const login = (request, email, password) => request.post(`${API}/auth/login`, { data: { email, password } });

test.describe('Password reset', () => {
  test('forgot-password answers identically for known and unknown emails', async ({ request }) => {
    const user = await newUser(request);
    const known = await request.post(`${API}/auth/forgot-password`, { data: { email: user.email } });
    const unknown = await request.post(`${API}/auth/forgot-password`, { data: { email: `nobody-${uniq()}@example.com` } });
    expect(known.status()).toBe(200);
    expect(unknown.status()).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    expect((await request.post(`${API}/auth/forgot-password`, { data: {} })).status()).toBe(400);
  });

  test('forgot-password is rate limited per IP', async ({ request }) => {
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await request.post(`${API}/auth/forgot-password`, { data: { email: `x${i}-${uniq()}@example.com` } })).status());
    expect(statuses.slice(0, 5).every((s) => s === 200), statuses.join()).toBe(true);
    expect(statuses).toContain(429);
  });

  test('a valid link sets the new password, signs everyone out, and works exactly once', async ({ request }) => {
    const user = await newUser(request);
    const secondSession = (await (await login(request, user.email, PASSWORD)).json()).sessionToken;
    const token = newToken(); seedReset(user.userId, token);
    const sibling = newToken(); seedReset(user.userId, sibling);   // an older, still-unused link

    const weak = await request.post(`${API}/auth/reset-password`, { data: { token, newPassword: 'short' } });
    expect(weak.status()).toBe(400);
    expect((await weak.json()).code).toBe('WEAK_PASSWORD');         // ...and the link is NOT consumed by a bad password

    const ok = await request.post(`${API}/auth/reset-password`, { data: { token, newPassword: NEW_PASSWORD } });
    expect(ok.status(), await ok.text()).toBe(200);

    expect((await login(request, user.email, NEW_PASSWORD)).status()).toBe(200);
    expect((await login(request, user.email, PASSWORD)).status()).toBe(401);                 // old password is dead
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(401);   // old sessions revoked
    expect((await request.get(`${API}/auth/me`, { headers: { 'X-Session-Token': secondSession } })).status()).toBe(401);

    const reuse = await request.post(`${API}/auth/reset-password`, { data: { token, newPassword: 'Third!Str0ngPass#3' } });
    expect(reuse.status()).toBe(400);
    const other = await request.post(`${API}/auth/reset-password`, { data: { token: sibling, newPassword: 'Third!Str0ngPass#3' } });
    expect(other.status()).toBe(400);                                // every other outstanding link was invalidated too
  });

  test('unknown, tampered and expired tokens are refused', async ({ request }) => {
    const user = await newUser(request);
    const token = newToken(); seedReset(user.userId, token);
    const expired = newToken(); seedReset(user.userId, expired, PAST);
    const reset = (t) => request.post(`${API}/auth/reset-password`, { data: { token: t, newPassword: NEW_PASSWORD } });

    expect((await reset('totally-made-up')).status()).toBe(400);
    expect((await reset(`${token}x`)).status()).toBe(400);
    expect((await reset(sha256(token))).status()).toBe(400);        // knowing the STORED hash is not enough
    const e = await reset(expired);
    expect(e.status()).toBe(400);
    expect((await e.json()).code).toBe('TOKEN_EXPIRED');
    expect((await request.post(`${API}/auth/reset-password`, { data: { token } })).status()).toBe(400); // missing password
    expect((await login(request, user.email, PASSWORD)).status()).toBe(200); // nothing changed
  });

  test('a reset also clears an account lockout', async ({ request }) => {
    const user = await newUser(request);
    for (let i = 0; i < 5; i++) await login(request, user.email, `wrong-${i}`);
    expect((await login(request, user.email, PASSWORD)).status()).toBe(401); // locked
    const token = newToken(); seedReset(user.userId, token);
    expect((await request.post(`${API}/auth/reset-password`, { data: { token, newPassword: NEW_PASSWORD } })).status()).toBe(200);
    expect((await login(request, user.email, NEW_PASSWORD)).status()).toBe(200);
  });

  test('two simultaneous uses of one link: exactly one wins', async ({ request }) => {
    const user = await newUser(request);
    const token = newToken(); seedReset(user.userId, token);
    const res = await Promise.all([NEW_PASSWORD, 'Racer!Str0ngPass#9'].map((newPassword) =>
      request.post(`${API}/auth/reset-password`, { data: { token, newPassword } })));
    expect(res.map((r) => r.status()).sort()).toEqual([200, 400]);
  });
});

test.describe('Email verification', () => {
  const verify = (request, token) => request.post(`${API}/auth/verify-email`, { data: { token } });
  const seedVerification = (userId, token, createdOffset = '+0 seconds') =>
    d1(`UPDATE users SET verification_token = '${sha256(token)}', email_verified = 0, created_at = datetime('now', '${createdOffset}') WHERE id = '${userId}'`);

  test('a valid token verifies the account once', async ({ request }) => {
    const user = await newUser(request);
    const token = newToken(); seedVerification(user.userId, token);
    expect((await (await request.get(`${API}/auth/me`, { headers: user.headers })).json()).user.emailVerified).toBe(false);
    expect((await verify(request, token)).status()).toBe(200);
    expect((await (await request.get(`${API}/auth/me`, { headers: user.headers })).json()).user.emailVerified).toBe(true);
    expect((await verify(request, token)).status()).toBe(400);      // single use
  });

  test('links expire after 24 hours, and bad tokens are refused', async ({ request }) => {
    const user = await newUser(request);
    const old = newToken(); seedVerification(user.userId, old, '-2 days');
    expect((await verify(request, old)).status()).toBe(400);
    expect((await verify(request, 'nope')).status()).toBe(400);
    expect((await request.post(`${API}/auth/verify-email`, { data: {} })).status()).toBe(400);
    expect((await (await request.get(`${API}/auth/me`, { headers: user.headers })).json()).user.emailVerified).toBe(false);
  });

  test('the raw token in the e-mail is not what is stored (a DB leak cannot verify accounts)', async ({ request }) => {
    const user = await newUser(request);
    const token = newToken(); seedVerification(user.userId, token);
    expect((await verify(request, sha256(token))).status()).toBe(400);
    expect((await verify(request, token)).status()).toBe(200);
  });
});

test.describe('Profile, logout and refresh', () => {
  test('profile updates validate input and need a session', async ({ request }) => {
    const user = await newUser(request);
    expect((await request.put(`${API}/auth/profile`, { data: { displayName: 'Nope' } })).status()).toBe(401);
    expect((await request.put(`${API}/auth/profile`, { headers: user.headers, data: { displayName: 'x'.repeat(101) } })).status()).toBe(400);
    const ok = await request.put(`${API}/auth/profile`, { headers: user.headers, data: { displayName: 'Ada Lovelace' } });
    expect(ok.status(), await ok.text()).toBe(200);
    expect((await (await request.get(`${API}/auth/me`, { headers: user.headers })).json()).user.displayName).toBe('Ada Lovelace');
  });

  test('logout kills only that session; refresh keeps a live one alive and rejects dead ones', async ({ request }) => {
    const user = await newUser(request);
    const other = (await (await login(request, user.email, PASSWORD)).json()).sessionToken;
    const refreshed = await request.post(`${API}/auth/refresh`, { headers: user.headers });
    expect(refreshed.status()).toBe(200);
    expect((await refreshed.json()).sessionToken).toBe(user.token);

    expect((await request.post(`${API}/auth/logout`, { headers: user.headers })).status()).toBe(200);
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(401);
    expect((await request.post(`${API}/auth/refresh`, { headers: user.headers })).status()).toBe(401);
    expect((await request.get(`${API}/auth/me`, { headers: { 'X-Session-Token': other } })).status()).toBe(200); // other device unaffected
    expect((await request.post(`${API}/auth/refresh`)).status()).toBe(400);
  });
});

test.describe('Account deletion', () => {
  test('needs the password; then removes the account, its sessions and its API keys', async ({ request, playwright }) => {
    const user = await newUser(request);
    const key = await newApiKey(request, user);
    const bare = await bareContext(playwright);
    const del = (data, headers = user.headers) => request.delete(`${API}/auth/account`, { headers, data });

    expect((await request.delete(`${API}/auth/account`, { data: { password: PASSWORD } })).status()).toBe(401);   // no session
    expect((await del({})).status()).toBe(400);                                                                     // no password
    expect((await del({ password: 'wrong-password-1' })).status()).toBe(403);                                      // wrong password
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(200);                   // nothing happened yet
    expect((await bare.get(`${API}/v1/stats`, { headers: key.headers })).status()).toBe(200);

    expect((await del({ password: PASSWORD })).status()).toBe(200);
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(401);
    expect((await login(request, user.email, PASSWORD)).status()).toBe(401);
    expect((await bare.get(`${API}/v1/stats`, { headers: key.headers })).status()).toBe(401);                     // keys must not outlive the account
    expect(d1(`SELECT COUNT(*) AS n FROM api_keys WHERE user_id = '${user.userId}'`, { json: true })[0].n).toBe(0);
    expect(d1(`SELECT COUNT(*) AS n FROM sessions WHERE user_id = '${user.userId}'`, { json: true })[0].n).toBe(0);
    await bare.dispose();
  });

  test('deleting one account does not touch another user', async ({ request }) => {
    const a = await newUser(request); const b = await newUser(request);
    expect((await request.delete(`${API}/auth/account`, { headers: a.headers, data: { password: PASSWORD } })).status()).toBe(200);
    expect((await request.get(`${API}/auth/me`, { headers: b.headers })).status()).toBe(200);
    expect((await login(request, b.email, PASSWORD)).status()).toBe(200);
  });

  test('a stolen session token cannot delete the account without the password', async ({ request }) => {
    const user = await newUser(request);
    for (const password of ['', 'guess-1', PASSWORD.toLowerCase()]) {
      const r = await request.delete(`${API}/auth/account`, { headers: user.headers, data: { password } });
      expect(r.status()).toBeGreaterThanOrEqual(400);
    }
    expect((await request.get(`${API}/auth/me`, { headers: user.headers })).status()).toBe(200);
  });
});

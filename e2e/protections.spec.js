/**
 * Country restriction and auto-burn ("suspicious activity") are enforced by the server using the
 * country Cloudflare resolves at the edge. In local dev the Worker honours a `CF-IPCountry` header
 * (ALLOW_COUNTRY_HEADER=1, set only by the dev script) so these tests can play visitors from
 * different countries: DE = sender, FR = elsewhere, XX = unknown, T1 = Tor.
 * API only, so Chromium only.
 */
import { test, expect } from './fixtures.js';
import { API, createMessage, newUser, newApiKey, bareContext, d1, IV } from './api-helpers.js';
import { generateTOTP } from '../backend/src/utils/totp.js';

test.describe.configure({ timeout: 120_000 });
test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'API tests are browser independent');
});

const from = (cc, extra = {}) => ({ 'cf-ipcountry': cc, ...extra });
const mk = (request, { geo = false, burn = false, from: cc = 'DE', body = {}, tag = true } = {}) =>
  createMessage(request, { tag, headers: from(cc), body: { requireGeoMatch: geo ? 1 : 0, autoBurnOnSuspicious: burn ? 1 : 0, maxPasswordAttempts: 10, ...body } });
const get = (request, m, cc, extra = {}) => request.get(`${API}/messages/${m.token}`, { headers: from(cc, { 'X-Auth-Tag': m.authTag, ...extra }) });
const meta = async (request, m, cc) => (await request.get(`${API}/messages/${m.token}/meta`, { headers: from(cc) })).json();
const wrongTag = Buffer.alloc(32, 3).toString('base64');
const gone = async (request, m) => (await request.get(`${API}/messages/${m.token}/meta`, { headers: from('DE') })).status() === 404;

test.describe('Country restriction', () => {
  test('only the sender\'s country can open the message; others are blocked without burning it', async ({ request }) => {
    const m = await mk(request, { geo: true });
    const blocked = await get(request, m, 'FR');
    expect(blocked.status()).toBe(403);
    const body = await blocked.json();
    expect(body.code).toBe('GEO_RESTRICTED');
    expect(body.error).toContain("sender's country");
    expect((await get(request, m, 'FR')).status()).toBe(403);           // repeated attempts don't burn it...
    expect((await get(request, m, 'DE')).status()).toBe(200);           // ...the sender's country still can open it
  });

  test('the page can tell, before the password, whether this visitor is allowed', async ({ request }) => {
    const m = await mk(request, { geo: true, burn: true });
    expect(await meta(request, m, 'DE')).toMatchObject({ geoRestricted: true, geoAllowed: true, autoBurn: true });
    expect(await meta(request, m, 'FR')).toMatchObject({ geoRestricted: true, geoAllowed: false });
    expect(await gone(request, m)).toBe(false);                          // asking about it never burns it
    const open = await mk(request);
    expect(await meta(request, open, 'FR')).toMatchObject({ geoRestricted: false, geoAllowed: true, autoBurn: false });
  });

  test('an unrestricted message opens from anywhere', async ({ request }) => {
    const m = await mk(request);
    expect((await get(request, m, 'FR')).status()).toBe(200);
  });

  test('an unknown country is blocked (fails closed), and so is Tor', async ({ request }) => {
    for (const cc of ['XX', 'T1']) {
      const m = await mk(request, { geo: true });
      const r = await get(request, m, cc);
      expect(r.status(), cc).toBe(403);
      expect((await r.json()).error).toContain('could not be determined');
      expect((await get(request, m, 'DE')).status()).toBe(200);
    }
  });

  test('country codes are case-insensitive', async ({ request }) => {
    const m = await mk(request, { geo: true, from: 'de' });
    expect((await get(request, m, 'De')).status()).toBe(200);
  });

  test('a restriction can only be set when the sender\'s own country is known', async ({ request }) => {
    const enc = await createMessage(request, { headers: from('DE') }); // baseline works
    expect(enc.token).toBeTruthy();
    const res = await request.post(`${API}/messages`, { headers: from('XX'), data: { encryptedData: 'abc', iv: IV, salt: IV, expiresIn: 3600, requireGeoMatch: 1 } });
    expect(res.status()).toBe(400);
    expect((await res.json()).code).toBe('GEO_UNAVAILABLE');
    const fine = await request.post(`${API}/messages`, { headers: from('XX'), data: { encryptedData: 'abc', iv: IV, salt: IV, expiresIn: 3600 } });
    expect(fine.status()).toBe(201);                                      // no restriction requested: unknown country is fine
  });

  test('2FA code checks and recipient burns are also restricted; the creator is never restricted', async ({ request }) => {
    const m = await mk(request, { geo: true, body: { require2FA: 1 } });
    const code = await request.post(`${API}/messages/${m.token}/verify-totp`, { headers: from('FR'), data: { code: generateTOTP(m.totp.secret) } });
    expect(code.status()).toBe(403);                                      // even a CORRECT code is refused from FR
    const ok = await request.post(`${API}/messages/${m.token}/verify-totp`, { headers: from('DE'), data: { code: generateTOTP(m.totp.secret) } });
    expect(ok.status()).toBe(200);

    const n = await mk(request, { geo: true });
    const burnFr = await request.delete(`${API}/messages/${n.token}`, { headers: from('FR', { 'X-Auth-Tag': n.authTag }) });
    expect(burnFr.status()).toBe(403);
    const creator = await request.delete(`${API}/messages/${n.token}`, { headers: from('FR', { 'X-Creator-Token': n.creatorToken }) });
    expect(creator.status()).toBe(200);                                   // the sender can always burn their own message
  });

  test('the public API applies the same rule', async ({ request, playwright }) => {
    const user = await newUser(request); const key = await newApiKey(request, user);
    const bare = await bareContext(playwright);
    const post = (cc) => bare.post(`${API}/v1/messages`, { headers: { ...key.headers, ...from(cc) }, data: { encryptedData: 'cipher', iv: IV, salt: IV, requireGeoMatch: true } });
    const unknown = await post('XX');
    expect(unknown.status()).toBe(400);
    const created = await post('DE');
    expect(created.status(), await created.text()).toBe(201);
    const { token } = await created.json();
    expect((await request.get(`${API}/messages/${token}`, { headers: from('FR') })).status()).toBe(403);
    expect((await request.get(`${API}/messages/${token}`, { headers: from('DE') })).status()).toBe(200);
    await bare.dispose();
  });
});

test.describe('Auto-burn on suspicious activity', () => {
  test('an attempt from a blocked country destroys the message at once', async ({ request }) => {
    const m = await mk(request, { geo: true, burn: true });
    const r = await get(request, m, 'FR');
    expect(r.status()).toBe(410);
    expect((await r.json()).code).toBe('AUTO_BURNED');
    expect((await get(request, m, 'DE')).status()).toBe(404);            // even the legitimate recipient is too late
    expect(await gone(request, m)).toBe(true);
  });

  test('wrong passwords from two different countries burn it, even with attempts to spare', async ({ request }) => {
    const m = await mk(request, { burn: true });
    const first = await get(request, m, 'DE', { 'X-Auth-Tag': wrongTag });
    expect(first.status()).toBe(401);                                    // one country alone: just a wrong password
    const second = await get(request, m, 'FR', { 'X-Auth-Tag': wrongTag });
    expect(second.status()).toBe(410);
    expect((await second.json()).code).toBe('AUTO_BURNED');
    expect((await get(request, m, 'DE')).status()).toBe(404);
  });

  test('many wrong passwords from ONE country are only limited by the attempt limit, not auto-burned', async ({ request }) => {
    const m = await mk(request, { burn: true, body: { maxPasswordAttempts: 10 } });
    for (let i = 0; i < 5; i++) expect((await get(request, m, 'DE', { 'X-Auth-Tag': wrongTag })).status()).toBe(401);
    expect((await get(request, m, 'DE')).status()).toBe(200);            // the real recipient still gets in
  });

  test('wrong 2FA codes from two countries burn it', async ({ request }) => {
    const m = await mk(request, { burn: true, body: { require2FA: 1 } });
    const bad = (cc) => request.post(`${API}/messages/${m.token}/verify-totp`, { headers: from(cc, { 'CF-Connecting-IP': `172.20.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200) + 1}` }), data: { code: '000000' } });
    expect((await bad('DE')).status()).toBe(401);
    const second = await bad('FR');
    expect(second.status()).toBe(410);
    expect((await second.json()).code).toBe('AUTO_BURNED');
  });

  test('any access through Tor burns it', async ({ request }) => {
    const m = await mk(request, { burn: true });
    const r = await get(request, m, 'T1');
    expect(r.status()).toBe(410);
    expect((await r.json()).code).toBe('AUTO_BURNED');
    expect(await gone(request, m)).toBe(true);
  });

  test('without auto-burn the same behaviour only blocks or counts: nothing is destroyed', async ({ request }) => {
    const a = await mk(request, { burn: false });
    expect((await get(request, a, 'DE', { 'X-Auth-Tag': wrongTag })).status()).toBe(401);
    expect((await get(request, a, 'FR', { 'X-Auth-Tag': wrongTag })).status()).toBe(401);   // two countries: still just a wrong password
    const tor = await request.get(`${API}/messages/${a.token}`, { headers: from('T1') });     // Tor, no password proof
    expect(tor.status()).toBe(401);                                                         // just "password required": no auto-burn when it is off
    expect((await get(request, a, 'DE')).status()).toBe(200);                               // still alive and openable

    const b = await mk(request, { geo: true, burn: false });
    expect((await get(request, b, 'FR')).status()).toBe(403);
    expect((await get(request, b, 'DE')).status()).toBe(200);
  });

  test('the sender can still burn their own message from anywhere, including Tor', async ({ request }) => {
    const m = await mk(request, { geo: true, burn: true });
    const r = await request.delete(`${API}/messages/${m.token}`, { headers: from('T1', { 'X-Creator-Token': m.creatorToken }) });
    expect(r.status()).toBe(200);
  });

  test('eight simultaneous suspicious requests: it is destroyed once, the rest see it gone', async ({ request }) => {
    const m = await mk(request, { geo: true, burn: true });
    const res = await Promise.all(Array.from({ length: 8 }, () => get(request, m, 'FR')));
    const statuses = res.map((r) => r.status());
    expect(statuses.filter((s) => s === 410).length, statuses.join()).toBe(1);
    expect(statuses.filter((s) => s !== 410).every((s) => s === 404), statuses.join()).toBe(true);
  });
});

test.describe('Privacy and the audit trail', () => {
  test('blocked and burned attempts are logged with the COUNTRY only, never an IP address', async ({ request }) => {
    const m = await mk(request, { geo: true, burn: true });
    await get(request, m, 'FR');
    const rows = d1(`SELECT event_type, country, metadata FROM audit_logs WHERE message_id = '${m.token}' ORDER BY id`, { json: true });
    const types = rows.map((r) => r.event_type);
    expect(types).toContain('geo_blocked');
    expect(types).toContain('auto_burned');
    expect(rows.find((r) => r.event_type === 'geo_blocked').country).toBe('FR');
    const dump = JSON.stringify(rows);
    expect(dump).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);                // no IPv4 anywhere
    expect(rows.find((r) => r.event_type === 'auto_burned').metadata).toContain('outside the allowed country');
  });

  test('failed guesses are recorded per country', async ({ request }) => {
    const m = await mk(request, { burn: false });
    await get(request, m, 'DE', { 'X-Auth-Tag': wrongTag });
    await get(request, m, 'FR', { 'X-Auth-Tag': wrongTag });
    const rows = d1(`SELECT country FROM audit_logs WHERE message_id = '${m.token}' AND event_type = 'failed_password'`, { json: true });
    expect(rows.map((r) => r.country).sort()).toEqual(['DE', 'FR']);
  });
});

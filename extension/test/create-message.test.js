import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCrypto, res } from './helpers.js';

const API = 'https://api.noteburner.work';

/** A fake NoteBurner API: records calls, answers per-route. */
function fakeServer(routes) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', headers: options.headers || {}, body: options.body, signal: options.signal });
    const handler = routes[`${options.method || 'GET'} ${new URL(url).pathname}`];
    if (!handler) throw new Error(`unexpected call ${options.method} ${url}`);
    return handler(options, calls.length);
  };
  return { calls, fetchImpl };
}
const happy = {
  'POST /api/app-token': () => res(200, { token: 'signed.token', expiresAt: Date.now() + 3600000 }),
  'POST /api/messages': () => res(201, { success: true, token: 'tok123', url: 'https://noteburner.work/m/tok123' }),
};

test('gets an app token first, then creates the message with it, against the production API', async () => {
  const { calls, fetchImpl } = fakeServer(happy);
  const out = await loadCrypto(fetchImpl).createSecureMessage('secret text', 'pw-12345678', '24');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `${API}/api/app-token`);
  assert.equal(calls[1].url, `${API}/api/messages`);
  assert.equal(calls[1].headers['X-App-Token'], 'signed.token');
  assert.deepEqual(out, { url: 'https://noteburner.work/m/tok123', id: 'tok123', expiresAt: undefined });
});

test('the request matches what the server accepts, and never contains the password or plaintext', async () => {
  const { calls, fetchImpl } = fakeServer(happy);
  await loadCrypto(fetchImpl).createSecureMessage('top secret plaintext', 'my-password-123', '6');
  const raw = calls[1].body;
  const body = JSON.parse(raw);
  assert.equal(body.expiresIn, 6 * 3600);
  assert.ok([16, 24].includes(body.iv.length) && [16, 24].includes(body.salt.length), 'iv/salt sizes the server validates');
  assert.ok(body.authTag.length >= 32 && body.authTag.length <= 128, 'password proof present and within the accepted range');
  assert.ok(body.encryptedData.length > 0);
  assert.ok(!raw.includes('top secret plaintext') && !raw.includes('my-password-123'), 'plaintext/password must never be sent');
  assert.equal(calls[1].headers['Content-Type'], 'application/json');
});

test('"No expiration" sends no expiry at all (not NaN/null)', async () => {
  const { calls, fetchImpl } = fakeServer(happy);
  await loadCrypto(fetchImpl).createSecureMessage('x', 'pw-12345678', '');
  assert.equal('expiresIn' in JSON.parse(calls[1].body), false);
});

test('every call has a timeout signal so the popup cannot hang', async () => {
  const { calls, fetchImpl } = fakeServer(happy);
  await loadCrypto(fetchImpl).createSecureMessage('x', 'pw-12345678', '1');
  assert.ok(calls.every((c) => c.signal && typeof c.signal.aborted === 'boolean'));
});

const failing = (status, body, headers) => ({
  ...happy,
  'POST /api/messages': () => res(status, body, headers),
});
const messageFor = async (routes) => {
  const { fetchImpl } = fakeServer(routes);
  try { await loadCrypto(fetchImpl).createSecureMessage('x', 'pw-12345678', '1'); } catch (e) { return e.message; }
  assert.fail('expected createSecureMessage to throw');
};

test('rate limiting is explained, with the wait time when the server gives one', async () => {
  assert.match(await messageFor(failing(429, { error: 'Rate limit exceeded' }, { 'retry-after': '7' })), /wait 7 seconds/);
  assert.match(await messageFor(failing(429, { error: 'x' }, { 'retry-after': '1' })), /wait 1 second and/);
  assert.match(await messageFor(failing(429, { error: 'x' })), /wait a minute/);
});

test('other failures give readable messages (server text, size, outage, gateway pages)', async () => {
  assert.equal(await messageFor(failing(400, { error: 'Invalid iv length' })), 'Invalid iv length');
  assert.match(await messageFor(failing(413, { error: 'Message too large' })), /too large/);
  assert.match(await messageFor(failing(503, { error: 'Server auth is not configured' })), /temporarily unavailable/);
  assert.match(await messageFor(failing(502, '<html>Bad gateway</html>')), /error 502/);
  assert.match(await messageFor(failing(500, { error: 'Internal server error' })), /Internal server error|error 500/);
  assert.match(await messageFor(failing(404, '<html>nope</html>')), /error 404/);
});

test('failing to get an app token is reported clearly (rate limited, outage)', async () => {
  const noToken = (status, body, headers) => ({ ...happy, 'POST /api/app-token': () => res(status, body, headers) });
  assert.match(await messageFor(noToken(429, { error: 'x' }, { 'retry-after': '30' })), /wait 30 seconds/);
  assert.match(await messageFor(noToken(503, { code: 'AUTH_NOT_CONFIGURED' })), /temporarily unavailable/);
});

test('network failures and timeouts are explained, not shown as raw errors', async () => {
  const offline = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(() => loadCrypto(offline).createSecureMessage('x', 'pw-12345678', '1'), /Could not reach NoteBurner/);
  const slow = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
  await assert.rejects(() => loadCrypto(slow).createSecureMessage('x', 'pw-12345678', '1'), /took too long/);
});

test('a Turnstile challenge from the server is reported with its code, so the popup can hand off to the website', async () => {
  const challenged = {
    ...happy,
    'POST /api/app-token': () => res(403, { error: 'A quick verification is required.', code: 'CHALLENGE_REQUIRED', siteKey: 'abc' }),
  };
  const { fetchImpl, calls } = fakeServer(challenged);
  await assert.rejects(
    () => loadCrypto(fetchImpl).createSecureMessage('x', 'pw-12345678', '1'),
    (err) => {
      assert.equal(err.code, 'CHALLENGE_REQUIRED');
      assert.match(err.message, /human check/);
      assert.match(err.message, /noteburner\.work/);
      return true;
    }
  );
  assert.equal(calls.length, 1, 'no message is sent without a session');
});

test('other errors carry the server code too, and an unrelated 403 is not mistaken for a challenge', async () => {
  const { fetchImpl } = fakeServer({ ...happy, 'POST /api/messages': () => res(403, { error: 'Forbidden', code: 'SOMETHING_ELSE' }) });
  await assert.rejects(
    () => loadCrypto(fetchImpl).createSecureMessage('x', 'pw-12345678', '1'),
    (err) => err.code === 'SOMETHING_ELSE' && err.message === 'Forbidden'
  );
});

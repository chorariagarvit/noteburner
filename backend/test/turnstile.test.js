import { test } from 'node:test';
import assert from 'node:assert/strict';
import appTokenRoute from '../src/routes/app-token.js';
import { verifyTurnstile, challengeEnabled } from '../src/utils/turnstile.js';
import { verifyAppToken } from '../src/utils/appToken.js';

const baseEnv = { APP_TOKEN_SECRET: 'dev-secret' };
const withChallenge = { ...baseEnv, TURNSTILE_SECRET_KEY: 'ts-secret', TURNSTILE_SITE_KEY: 'site-123' };
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

/** Records what is sent to Cloudflare and answers with `reply`. */
const fakeCloudflare = (reply) => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, form: Object.fromEntries(init.body) }); return typeof reply === 'function' ? reply() : reply; };
  return { calls, fetchImpl };
};

const post = (env, body, headers = {}) =>
  appTokenRoute.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }, env);

test('the challenge is off unless a secret is configured', async () => {
  assert.equal(challengeEnabled(baseEnv), false);
  assert.equal(challengeEnabled(withChallenge), true);
  const res = await post(baseEnv, undefined);                    // exactly how local dev / CI behave today
  assert.equal(res.status, 200);
  assert.ok(verifyAppToken((await res.json()).token, 'dev-secret'));
});

test('verifyTurnstile sends the secret, the response token and the client IP to Cloudflare', async () => {
  const cf = fakeCloudflare(json({ success: true }));
  assert.deepEqual(await verifyTurnstile(withChallenge, 'solved-token', '203.0.113.7', cf.fetchImpl), { ok: true });
  assert.equal(cf.calls[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepEqual(cf.calls[0].form, { secret: 'ts-secret', response: 'solved-token', remoteip: '203.0.113.7' });
});

test('rejected, empty, oversized and non-string tokens are refused without calling Cloudflare when malformed', async () => {
  const cf = fakeCloudflare(json({ success: false, 'error-codes': ['invalid-input-response'] }));
  assert.deepEqual(await verifyTurnstile(withChallenge, 'bad', '1.1.1.1', cf.fetchImpl), { ok: false, reason: 'invalid-input-response' });
  const never = fakeCloudflare(() => { throw new Error('must not be called'); });
  for (const bad of [undefined, null, '', 'x'.repeat(2049), 12345, {}, ['a']]) {
    assert.equal((await verifyTurnstile(withChallenge, bad, '1.1.1.1', never.fetchImpl)).ok, false, String(bad));
  }
  assert.equal(never.calls.length, 0);
});

test('an unreachable verification service throws (the endpoint turns that into a retryable 503)', async () => {
  await assert.rejects(() => verifyTurnstile(withChallenge, 't', '1.1.1.1', async () => json({}, 500)), /responded 500/);
  await assert.rejects(() => verifyTurnstile(withChallenge, 't', '1.1.1.1', async () => { throw new Error('network down'); }), /network down/);
});

test('endpoint: no token -> 403 CHALLENGE_REQUIRED with the public site key (never the secret)', async () => {
  const res = await post(withChallenge, {});
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.code, 'CHALLENGE_REQUIRED');
  assert.equal(body.siteKey, 'site-123');
  assert.ok(!JSON.stringify(body).includes('ts-secret'));
  assert.equal((await post(withChallenge, undefined)).status, 403);                 // no body at all
  assert.equal((await post(withChallenge, { turnstileToken: 42 })).status, 403);    // wrong type
});

test('endpoint: a token Cloudflare accepts yields an app token; one it rejects does not', async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => json({ success: true });
    const ok = await post(withChallenge, { turnstileToken: 'good' });
    assert.equal(ok.status, 200);
    assert.ok(verifyAppToken((await ok.json()).token, 'dev-secret'));

    globalThis.fetch = async () => json({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    const denied = await post(withChallenge, { turnstileToken: 'replayed' });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, 'CHALLENGE_REQUIRED');
  } finally { globalThis.fetch = realFetch; }
});

test('endpoint: if Cloudflare cannot be reached the answer is a retryable 503, not an open door', async () => {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('network down'); };
    const res = await post(withChallenge, { turnstileToken: 'whatever' });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, 'CHALLENGE_UNAVAILABLE');
  } finally { globalThis.fetch = realFetch; }
});

test('endpoint: still refuses when the app-token secret itself is missing', async () => {
  assert.equal((await post({ TURNSTILE_SECRET_KEY: 'x' }, {})).status, 503);
});

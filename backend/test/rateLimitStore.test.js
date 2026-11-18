import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { RateLimiter } from '../src/durable/RateLimiter.js';
import { consume } from '../src/utils/rateLimitStore.js';
import { rateLimitMiddleware } from '../src/middleware/rateLimit.js';
import { enhancedRateLimit } from '../src/middleware/security.js';

/** In-memory stand-in for a Durable Object's storage. */
function fakeState() {
  const data = new Map(); let alarm = null;
  return {
    data,
    get alarm() { return alarm; },
    storage: {
      async get(k) { return data.get(k); },
      async put(k, v) { data.set(k, v); },
      async setAlarm(t) { alarm = t; },
      async deleteAll() { data.clear(); alarm = null; },
    },
  };
}
const call = (obj, body) => obj.fetch(new Request('https://x/consume', { method: 'POST', body: JSON.stringify(body) }));

/** A fake DurableObjectNamespace: one RateLimiter per name, like the real thing. */
function fakeNamespace() {
  const objects = new Map();
  return {
    objects,
    idFromName: (name) => name,
    get(id) {
      if (!objects.has(id)) objects.set(id, new RateLimiter(fakeState()));
      const obj = objects.get(id);
      return { fetch: (url, init) => obj.fetch(new Request(url, init)) };
    },
  };
}

test('RateLimiter DO: counts up to the limit, then refuses, reporting the window end', async () => {
  const obj = new RateLimiter(fakeState());
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await (await call(obj, { limit: 3, windowSeconds: 60 })).json());
  assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false, false]);
  assert.deepEqual(results.map((r) => r.count), [1, 2, 3, 3, 3]);
  assert.ok(results[0].resetAt > Date.now() / 1000);
  assert.equal(results[0].resetAt, results[4].resetAt, 'the window must not slide');
});

test('RateLimiter DO: a finished window starts over, and idle state cleans itself up', async () => {
  const state = fakeState(); const obj = new RateLimiter(state);
  await call(obj, { limit: 1, windowSeconds: 60 });
  assert.equal((await (await call(obj, { limit: 1, windowSeconds: 60 })).json()).allowed, false);
  state.data.set('window', { count: 1, resetAt: Math.floor(Date.now() / 1000) - 1 });   // window ended
  assert.equal((await (await call(obj, { limit: 1, windowSeconds: 60 })).json()).allowed, true);
  assert.ok(state.alarm > Date.now(), 'an alarm is scheduled to wipe the key');
  state.data.set('window', { count: 1, resetAt: Math.floor(Date.now() / 1000) - 10 });
  await obj.alarm();
  assert.equal(state.data.size, 0, 'expired state is deleted by the alarm');
});

test('RateLimiter DO: rejects malformed or abusive parameters', async () => {
  const obj = new RateLimiter(fakeState());
  for (const bad of [{}, { limit: 0, windowSeconds: 60 }, { limit: 5, windowSeconds: 0 }, { limit: 'x', windowSeconds: 60 },
    { limit: 5, windowSeconds: 10 ** 9 }, { limit: 10 ** 9, windowSeconds: 60 }, { limit: 1.5, windowSeconds: 60 }]) {
    assert.equal((await call(obj, bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await obj.fetch(new Request('https://x', { method: 'POST', body: 'not json' }))).status, 400);
});

test('consume(): uses the Durable Object when bound, and separate keys are independent', async () => {
  const env = { RATE_LIMITER: fakeNamespace() };
  assert.equal((await consume(env, 'a', 1, 60)).allowed, true);
  assert.equal((await consume(env, 'a', 1, 60)).allowed, false);
  assert.equal((await consume(env, 'b', 1, 60)).allowed, true);
  assert.equal(env.RATE_LIMITER.objects.size, 2);
});

test('consume(): falls back to KV without the binding, and returns null with no store at all', async () => {
  const store = new Map();
  const kv = { async get(k) { return store.get(k)?.value ?? null; }, async put(k, value, opts) { store.set(k, { value, opts }); } };
  assert.equal((await consume({ CACHE: kv }, 'k', 1, 60)).allowed, true);
  assert.equal((await consume({ CACHE: kv }, 'k', 1, 60)).allowed, false);
  assert.equal(await consume({}, 'k', 1, 60), null);
});

test('consume(): a failing Durable Object throws (so the middleware can fail open)', async () => {
  const broken = { idFromName: (n) => n, get: () => ({ fetch: async () => new Response('boom', { status: 500 }) }) };
  await assert.rejects(() => consume({ RATE_LIMITER: broken }, 'k', 1, 60), /rate limiter responded 500/);
});

for (const [name, make] of [
  ['rateLimitMiddleware', (n) => rateLimitMiddleware(n, 60)],
  ['enhancedRateLimit', (n) => enhancedRateLimit({ maxRequests: n, windowMs: 60000 })],
]) {
  const appWith = (mw) => new Hono().use('*', mw).get('/', (c) => c.text('ok'));
  const hit = (app, env, ip = '1.2.3.4') => app.request('/', { headers: { 'CF-Connecting-IP': ip } }, env);

  test(`${name} + Durable Object: limit, headers, per-IP`, async () => {
    const app = appWith(make(2)); const env = { RATE_LIMITER: fakeNamespace() };
    const r = [await hit(app, env), await hit(app, env), await hit(app, env), await hit(app, env, '9.9.9.9')];
    assert.deepEqual(r.map((x) => x.status), [200, 200, 429, 200]);
    assert.equal(r[0].headers.get('x-ratelimit-limit'), '2');
    assert.equal(r[0].headers.get('x-ratelimit-remaining'), '1');
    assert.equal(r[2].headers.get('x-ratelimit-remaining'), '0');
    assert.ok(Number(r[2].headers.get('retry-after')) > 0);
  });

  test(`${name} + Durable Object: fails OPEN when the object errors`, async () => {
    const broken = { idFromName: (n) => n, get: () => ({ fetch: async () => { throw new Error('DO unavailable'); } }) };
    assert.equal((await hit(appWith(make(1)), { RATE_LIMITER: broken })).status, 200);
  });
}

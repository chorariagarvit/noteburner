import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { rateLimitMiddleware } from '../src/middleware/rateLimit.js';
import { enhancedRateLimit } from '../src/middleware/security.js';

function fakeKv({ failGet = false, failPut = false } = {}) {
  const store = new Map();
  return {
    store,
    async get(k) { if (failGet) throw new Error('KV unavailable'); return store.get(k)?.value ?? null; },
    async put(k, value, opts = {}) { if (failPut) throw new Error('429 too many writes to this key'); store.set(k, { value, opts }); },
  };
}

const appWith = (middleware) => new Hono().use('*', middleware).get('/', (c) => c.text('ok'));
const hit = (app, kv, ip = '1.2.3.4') => app.request('/', { headers: { 'CF-Connecting-IP': ip } }, { CACHE: kv });

for (const [name, make] of [
  ['rateLimitMiddleware', (n) => rateLimitMiddleware(n, 60)],
  ['enhancedRateLimit', (n) => enhancedRateLimit({ maxRequests: n, windowMs: 60000 })],
]) {
  test(`${name}: allows up to the limit, then 429 with rate-limit headers`, async () => {
    const app = appWith(make(3)); const kv = fakeKv();
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hit(app, kv));
    assert.deepEqual(results.map((r) => r.status), [200, 200, 200, 429, 429]);
    assert.equal(results[0].headers.get('x-ratelimit-limit'), '3');
    assert.equal(results[0].headers.get('x-ratelimit-remaining'), '2');
    assert.equal(results[2].headers.get('x-ratelimit-remaining'), '0');
    assert.ok(Number(results[0].headers.get('x-ratelimit-reset')) > Date.now() / 1000);
    assert.equal(results[3].headers.get('x-ratelimit-remaining'), '0');
    assert.ok(Number(results[3].headers.get('retry-after')) > 0);
  });

  test(`${name}: limits are per client IP`, async () => {
    const app = appWith(make(1)); const kv = fakeKv();
    assert.equal((await hit(app, kv, '10.0.0.1')).status, 200);
    assert.equal((await hit(app, kv, '10.0.0.1')).status, 429);
    assert.equal((await hit(app, kv, '10.0.0.2')).status, 200);
  });

  test(`${name}: every KV write keeps an expiry (counters can never become permanent)`, async () => {
    const app = appWith(make(10)); const kv = fakeKv();
    for (let i = 0; i < 4; i++) await hit(app, kv);
    for (const { opts } of kv.store.values()) {
      assert.ok(opts.expiration || opts.expirationTtl, 'a KV put without an expiry removes the existing one');
    }
  });

  test(`${name}: a finished window starts over`, async () => {
    const app = appWith(make(1)); const kv = fakeKv();
    assert.equal((await hit(app, kv)).status, 200);
    assert.equal((await hit(app, kv)).status, 429);
    for (const [k, v] of kv.store) kv.store.set(k, { ...v, value: `1|${Math.floor(Date.now() / 1000) - 1}` }); // window ended 1s ago
    assert.equal((await hit(app, kv)).status, 200);
  });

  test(`${name}: fails OPEN when KV reads error (a KV outage must not take the API down)`, async () => {
    const res = await hit(appWith(make(1)), fakeKv({ failGet: true }));
    assert.equal(res.status, 200);
  });

  test(`${name}: fails OPEN when KV writes error (e.g. KV's 1 write/second per key limit)`, async () => {
    const app = appWith(make(5)); const kv = fakeKv({ failPut: true });
    for (let i = 0; i < 3; i++) assert.equal((await hit(app, kv)).status, 200);
  });

  test(`${name}: without a KV binding requests are allowed`, async () => {
    const res = await appWith(make(1)).request('/', { headers: { 'CF-Connecting-IP': '9.9.9.9' } }, {});
    assert.equal(res.status, 200);
  });
}

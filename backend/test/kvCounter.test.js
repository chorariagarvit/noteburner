import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCounter, bumpCounter } from '../src/utils/kvCounter.js';

function fakeKv() {
  const store = new Map();
  return {
    store,
    async get(k) { const e = store.get(k); return e ? e.value : null; },
    async put(k, value, opts = {}) { store.set(k, { value, opts }); },
  };
}

test('every write carries an expiration (never permanent)', async () => {
  const kv = fakeKv();
  let c = await readCounter(kv, 'k');
  for (let i = 0; i < 5; i++) { c = await bumpCounter(kv, 'k', await readCounter(kv, 'k'), 60); }
  const { opts } = kv.store.get('k');
  assert.ok(opts.expiration || opts.expirationTtl, 'expiry must be set on later writes');
  assert.equal(c.count, 5);
});

test('window does not slide: reset time stays the same across increments', async () => {
  const kv = fakeKv();
  const first = await bumpCounter(kv, 'k', await readCounter(kv, 'k'), 3600);
  const second = await bumpCounter(kv, 'k', await readCounter(kv, 'k'), 3600);
  assert.equal(first.resetAt, second.resetAt);
});

test('counter resets after the window passes', async () => {
  const kv = fakeKv();
  kv.store.set('k', { value: `9|${Math.floor(Date.now() / 1000) - 5}`, opts: {} });
  assert.equal((await readCounter(kv, 'k')).count, 0);
});

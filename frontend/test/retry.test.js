import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithRetry } from '../src/utils/retry.js';

const res = (status) => ({ status, ok: status < 400 });
/** A fetch that answers with the given outcomes in order; an Error means a network failure. */
const script = (...outcomes) => {
  const calls = [];
  const fn = async () => {
    calls.push(1);
    const next = outcomes[Math.min(calls.length - 1, outcomes.length - 1)];
    if (next instanceof Error) throw next;
    return res(next);
  };
  return { fn, calls };
};
const fast = { baseDelayMs: 1 };

test('a good answer is returned at once without a retry', async () => {
  const { fn, calls } = script(200);
  assert.equal((await fetchWithRetry('/x', {}, { ...fast, fetchImpl: fn })).status, 200);
  assert.equal(calls.length, 1);
});

test('a 503 is retried and the later good answer is returned', async () => {
  const { fn, calls } = script(503, 503, 200);
  assert.equal((await fetchWithRetry('/x', {}, { ...fast, fetchImpl: fn })).status, 200);
  assert.equal(calls.length, 3);
});

test('a network failure is retried', async () => {
  const { fn, calls } = script(new TypeError('Failed to fetch'), 200);
  assert.equal((await fetchWithRetry('/x', {}, { ...fast, fetchImpl: fn })).status, 200);
  assert.equal(calls.length, 2);
});

test('real answers (404, 410, 429) are never retried', async () => {
  for (const status of [404, 410, 429, 500]) {
    const { fn, calls } = script(status, 200);
    assert.equal((await fetchWithRetry('/x', {}, { ...fast, fetchImpl: fn })).status, status);
    assert.equal(calls.length, 1, `status ${status} must not be retried`);
  }
});

test('after the last try the final 503 is returned, not thrown', async () => {
  const { fn, calls } = script(503);
  assert.equal((await fetchWithRetry('/x', {}, { ...fast, retries: 2, fetchImpl: fn })).status, 503);
  assert.equal(calls.length, 3);
});

test('after the last try a network failure is thrown', async () => {
  const { fn, calls } = script(new TypeError('offline'));
  await assert.rejects(fetchWithRetry('/x', {}, { ...fast, retries: 1, fetchImpl: fn }), /offline/);
  assert.equal(calls.length, 2);
});

test('a request the caller cancelled is not retried', async () => {
  const controller = new AbortController();
  controller.abort();
  const { fn, calls } = script(new DOMException('aborted', 'AbortError'), 200);
  await assert.rejects(fetchWithRetry('/x', { signal: controller.signal }, { ...fast, fetchImpl: fn }));
  assert.equal(calls.length, 1);
});

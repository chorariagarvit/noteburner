import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corsConfig, ALLOWED_ORIGINS } from '../src/config/cors.js';

const prod = { env: { ENVIRONMENT: 'production' } };
const dev = { env: { ENVIRONMENT: 'development' } };

test('no Origin header gets no CORS headers (null, not a fallback origin)', () => {
  assert.equal(corsConfig.origin(undefined, prod), null);
  assert.equal(corsConfig.origin('', dev), null);
});

test('unknown origins are rejected instead of falling back to an allowed one', () => {
  assert.equal(corsConfig.origin('https://evil.example', prod), null);
  assert.equal(corsConfig.origin('https://noteburner.work.evil.example', prod), null);
});

test('production origin is allowed; localhost only outside production', () => {
  assert.equal(corsConfig.origin('https://noteburner.work', prod), 'https://noteburner.work');
  assert.equal(corsConfig.origin('http://localhost:5173', prod), null);
  assert.equal(corsConfig.origin('http://127.0.0.1:5173', prod), null);
  assert.equal(corsConfig.origin('http://localhost:5173', dev), 'http://localhost:5173');
});

test('browser extension origins are accepted', () => {
  assert.equal(corsConfig.origin('chrome-extension://abcdef', prod), 'chrome-extension://abcdef');
  assert.equal(corsConfig.origin('moz-extension://abcdef', prod), 'moz-extension://abcdef');
});

test('custom auth headers used by the app are allowed in preflight', () => {
  for (const h of ['X-App-Token', 'X-Auth-Tag', 'X-TOTP-Proof', 'X-Creator-Token', 'X-Session-Token', 'X-API-Key', 'Authorization']) {
    assert.ok(corsConfig.allowHeaders.includes(h), `${h} missing from allowHeaders`);
  }
  assert.ok(ALLOWED_ORIGINS.every((o) => !o.includes('noteburner.app')), 'stale domain still listed');
});

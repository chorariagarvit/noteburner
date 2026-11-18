import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampInt, limitOrUnlimited, flag, validIvOrSalt, MAX_EXPIRY_SECONDS, MAX_ENCRYPTED_CHARS } from '../src/utils/messageOptions.js';

test('clampInt bounds, truncates and falls back on garbage', () => {
  assert.equal(clampInt(5, 1, 10, 3), 5);
  assert.equal(clampInt(999, 1, 10, 3), 10);
  assert.equal(clampInt(-4, 1, 10, 3), 1);
  assert.equal(clampInt('7', 1, 10, 3), 7);
  assert.equal(clampInt(2.9, 1, 10, 3), 2);
  for (const bad of ['abc', NaN, undefined, null, {}, []]) assert.equal(clampInt(bad, 1, 10, 3), 3, String(bad));
});

test('limitOrUnlimited keeps -1 (unlimited) and clamps everything else to 1..10', () => {
  assert.equal(limitOrUnlimited(-1, 1), -1);
  assert.equal(limitOrUnlimited('-1', 1), -1);
  assert.equal(limitOrUnlimited(0, 3), 1);       // 0 and other negatives are NOT "unlimited"
  assert.equal(limitOrUnlimited(-2, 3), 1);
  assert.equal(limitOrUnlimited(3, 1), 3);
  assert.equal(limitOrUnlimited(999999, 1), 10);
  assert.equal(limitOrUnlimited(undefined, 3), 3);
});

test('flag only accepts explicit truthy markers', () => {
  for (const v of [true, 1, '1']) assert.equal(flag(v), 1);
  for (const v of [false, 0, '0', 'true', 'yes', null, undefined, 2, {}]) assert.equal(flag(v), 0, String(v));
});

test('iv/salt must be 16 raw chars or 24 base64 chars, and strings only', () => {
  assert.equal(validIvOrSalt('AAAAAAAAAAAAAAAAAAAAAA=='), true);
  assert.equal(validIvOrSalt('0123456789abcdef'), true);
  for (const bad of ['', 'short', 'A'.repeat(25), 12345, null, undefined, {}, ['A'.repeat(24)]]) assert.equal(validIvOrSalt(bad), false, String(bad));
});

test('limits stay within D1 and product bounds', () => {
  assert.equal(MAX_EXPIRY_SECONDS, 30 * 24 * 3600);
  assert.ok(MAX_ENCRYPTED_CHARS < 2 * 1024 * 1024, 'must stay under the 2 MB D1 row limit');
});

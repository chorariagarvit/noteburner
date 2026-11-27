import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyStripeSignature } from '../src/utils/stripeSignature.js';

const secret = `whsec_${crypto.randomBytes(16).toString('hex')}`; // random per run
const body = '{"type":"checkout.session.completed"}';
const sign = (ts, payload = body, key = secret) =>
  `t=${ts},v1=${crypto.createHmac('sha256', key).update(`${ts}.${payload}`).digest('hex')}`;
const now = () => Math.floor(Date.now() / 1000);

test('accepts a correctly signed, fresh payload', () => {
  const ts = now();
  assert.equal(verifyStripeSignature({ secret, header: sign(ts), rawBody: body }), true);
});

test('rejects a tampered body, wrong secret, and malformed headers', () => {
  const ts = now();
  assert.equal(verifyStripeSignature({ secret, header: sign(ts), rawBody: body + ' ' }), false);
  assert.equal(verifyStripeSignature({ secret, header: sign(ts, body, 'other'), rawBody: body }), false);
  for (const header of ['', 'garbage', 't=123', 'v1=abc', `t=${ts},v1=`, undefined]) {
    assert.equal(verifyStripeSignature({ secret, header, rawBody: body }), false, String(header));
  }
});

test('rejects stale (replayed) signatures and honours the tolerance', () => {
  const old = now() - 3600;
  assert.equal(verifyStripeSignature({ secret, header: sign(old), rawBody: body }), false);
  assert.equal(verifyStripeSignature({ secret, header: sign(old), rawBody: body, toleranceSeconds: 7200 }), true);
});

test('fails closed when no secret is configured', () => {
  assert.equal(verifyStripeSignature({ secret: undefined, header: sign(now()), rawBody: body }), false);
  assert.equal(verifyStripeSignature({ secret: '', header: sign(now()), rawBody: body }), false);
});

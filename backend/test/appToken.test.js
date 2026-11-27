import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppToken, verifyAppToken } from '../src/utils/appToken.js';
import { verifySlackSignature } from '../src/utils/slackSignature.js';
import crypto from 'node:crypto';

test('app token round-trips and rejects tampering / wrong secret / expiry', () => {
  const { token } = createAppToken('s3cret');
  assert.equal(verifyAppToken(token, 's3cret'), true);
  assert.equal(verifyAppToken(token, 'other'), false);
  assert.equal(verifyAppToken(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'), 's3cret'), false);
  assert.equal(verifyAppToken(createAppToken('s3cret', -1).token, 's3cret'), false);
  assert.equal(verifyAppToken('', 's3cret'), false);
  assert.equal(verifyAppToken(token, ''), false); // fail closed with no secret
  assert.throws(() => createAppToken(''));
});

test('slack signature: valid, tampered, stale, and missing secret (fail closed)', () => {
  const secret = crypto.randomBytes(16).toString('hex'), body = 'text=hi', ts = String(Math.floor(Date.now() / 1000));
  const sig = 'v0=' + crypto.createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex');
  assert.equal(verifySlackSignature({ secret, timestamp: ts, signature: sig, rawBody: body }), true);
  assert.equal(verifySlackSignature({ secret, timestamp: ts, signature: sig, rawBody: 'text=evil' }), false);
  assert.equal(verifySlackSignature({ secret, timestamp: String(Number(ts) - 1000), signature: sig, rawBody: body }), false);
  assert.equal(verifySlackSignature({ secret: undefined, timestamp: ts, signature: sig, rawBody: body }), false);
});

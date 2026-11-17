import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTOTPSecret, generateTOTP, verifyTOTP, createTotpProof, verifyTotpProof
} from '../src/utils/totp.js';
import { generateRandomSlug } from '../src/utils/slugValidation.js';

test('secret is 32 valid base32 chars and unique', () => {
  const a = generateTOTPSecret();
  assert.match(a, /^[A-Z2-7]{32}$/);
  assert.notEqual(a, generateTOTPSecret());
});

test('verifyTOTP accepts current code and rejects wrong code', () => {
  const s = generateTOTPSecret();
  assert.equal(verifyTOTP(generateTOTP(s), s), true);
  assert.equal(verifyTOTP('000000', s) && verifyTOTP('000001', s) && verifyTOTP('000002', s), false);
});

test('proof validates only for same secret + identifier and before expiry', () => {
  const s = generateTOTPSecret();
  const proof = createTotpProof(s, 'msg1');
  assert.equal(verifyTotpProof(proof, s, 'msg1'), true);
  assert.equal(verifyTotpProof(proof, s, 'msg2'), false);
  assert.equal(verifyTotpProof(proof, generateTOTPSecret(), 'msg1'), false);
  assert.equal(verifyTotpProof(createTotpProof(s, 'msg1', -1), s, 'msg1'), false);
  assert.equal(verifyTotpProof('garbage', s, 'msg1'), false);
  assert.equal(verifyTotpProof(undefined, s, 'msg1'), false);
});

test('random slug starts with a letter', () => {
  for (let i = 0; i < 50; i++) assert.match(generateRandomSlug(), /^[a-z][a-z0-9]{7}$/);
});

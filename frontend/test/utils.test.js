import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAuthTag, encryptMessage, decryptMessage, generatePassword } from '../src/utils/crypto.js';
import { sanitizedPath } from '../src/utils/analytics.js';

test('auth tag is deterministic, password- and salt-specific, 32 bytes', async () => {
  const enc = await encryptMessage('hello', 'pw-12345678');
  const a = await deriveAuthTag('pw-12345678', enc.salt);
  assert.equal(a, await deriveAuthTag('pw-12345678', enc.salt));
  assert.notEqual(a, await deriveAuthTag('pw-12345679', enc.salt));
  const other = await encryptMessage('hello', 'pw-12345678');
  assert.notEqual(a, await deriveAuthTag('pw-12345678', other.salt));
  assert.equal(Buffer.from(a, 'base64').length, 32);
});

test('auth tag is independent of the encryption key (domain separated)', async () => {
  // A leaked tag/hash must not decrypt anything: decrypting with the tag as a "password" fails.
  const enc = await encryptMessage('top secret', 'correct-horse');
  const tag = await deriveAuthTag('correct-horse', enc.salt);
  await assert.rejects(() => decryptMessage(enc.encryptedData, enc.iv, enc.salt, tag));
  assert.equal(await decryptMessage(enc.encryptedData, enc.iv, enc.salt, 'correct-horse'), 'top secret');
});

test('decrypt rejects a wrong password and tampered ciphertext', async () => {
  const enc = await encryptMessage('data', 'right-password');
  await assert.rejects(() => decryptMessage(enc.encryptedData, enc.iv, enc.salt, 'wrong-password'));
  const tampered = Buffer.from(enc.encryptedData, 'base64');
  tampered[0] ^= 0xff;
  await assert.rejects(() => decryptMessage(tampered.toString('base64'), enc.iv, enc.salt, 'right-password'));
});

test('generatePassword returns the requested length and varies', () => {
  const a = generatePassword(20);
  assert.equal(a.length, 20);
  assert.notEqual(a, generatePassword(20));
});

test('analytics never receives capability URLs or one-time tokens', () => {
  assert.equal(sanitizedPath('/m/AbC123secretToken'), '/m/:id');
  assert.equal(sanitizedPath('/m/my-custom-slug'), '/m/:id');
  assert.equal(sanitizedPath('/reset-password'), '/reset-password');
  assert.equal(sanitizedPath('/verify-email'), '/verify-email');
  assert.equal(sanitizedPath('/pricing'), '/pricing');
  assert.equal(sanitizedPath('/'), '/');
});

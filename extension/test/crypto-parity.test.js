import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCrypto } from './helpers.js';
import { deriveAuthTag as appAuthTag, decryptMessage as appDecrypt, encryptMessage as appEncrypt } from '../../frontend/src/utils/crypto.js';

const ext = loadCrypto();

test('the password proof (auth tag) is identical in the extension and the web app', async () => {
  const salt = Buffer.alloc(16, 9).toString('base64');
  assert.equal(await ext.deriveAuthTag('correct horse', salt), await appAuthTag('correct horse', salt));
  assert.notEqual(await ext.deriveAuthTag('correct horse', salt), await ext.deriveAuthTag('correct horse!', salt));
});

test('a message encrypted by the extension decrypts in the web app', async () => {
  const enc = await ext.encryptMessage('hello from the extension ✓', 'ext-password-1');
  assert.equal(await appDecrypt(enc.encryptedData, enc.iv, enc.salt, 'ext-password-1'), 'hello from the extension ✓');
  await assert.rejects(() => appDecrypt(enc.encryptedData, enc.iv, enc.salt, 'wrong-password'));
});

test('the extension and the web app use the same IV/salt sizes (the server validates them)', async () => {
  const a = await ext.encryptMessage('x', 'pw-pw-pw-pw');
  const b = await appEncrypt('x', 'pw-pw-pw-pw');
  assert.equal(a.iv.length, b.iv.length);
  assert.equal(a.salt.length, b.salt.length);
  assert.ok([16, 24].includes(a.iv.length) && [16, 24].includes(a.salt.length));
});

test('generated passwords have the right length and no obvious bias', () => {
  const counts = new Map();
  for (let i = 0; i < 300; i++) {
    const pw = ext.generatePassword(16);
    assert.equal(pw.length, 16);
    for (const ch of pw) counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  assert.equal(counts.size, 70, 'every character of the alphabet should appear in 4800 samples');
  const min = Math.min(...counts.values()); const max = Math.max(...counts.values());
  assert.ok(min > 30 && max < 110, `distribution looks skewed: min ${min}, max ${max} (expected ~69)`);
  assert.notEqual(ext.generatePassword(16), ext.generatePassword(16));
});

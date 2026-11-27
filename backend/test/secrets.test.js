import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { hashCreatorToken, isHashedCreatorToken, matchesCreatorToken, upgradeCreatorToken, migrateLegacyCreatorTokens } from '../src/utils/creatorToken.js';
import { sealSecret, openSecret, isSealed, migrateLegacyTotpSecrets } from '../src/utils/secretBox.js';

const env = { TOTP_ENCRYPTION_KEY: 'unit-test-key' };

test('creator tokens: a hashed value matches only the right token', async () => {
  const raw = 'creatorTokenCreatorToken1234567x';
  const stored = await hashCreatorToken(raw);
  assert.match(stored, /^[0-9a-f]{64}$/);
  assert.notEqual(stored, raw);
  assert.deepEqual(await matchesCreatorToken(stored, raw), { ok: true, legacy: false });
  assert.deepEqual(await matchesCreatorToken(stored, raw + 'x'), { ok: false, legacy: false });
  assert.deepEqual(await matchesCreatorToken(stored, stored), { ok: false, legacy: false }); // the stored hash is NOT a credential
});

test('creator tokens: legacy raw values still match, and are flagged for upgrade', async () => {
  const raw = 'legacyRawToken0123456789abcdefgh';
  assert.equal(isHashedCreatorToken(raw), false);
  assert.deepEqual(await matchesCreatorToken(raw, raw), { ok: true, legacy: true });
  assert.deepEqual(await matchesCreatorToken(raw, 'other'), { ok: false, legacy: true });
  for (const bad of [null, undefined, '']) {
    assert.equal((await matchesCreatorToken(bad, raw)).ok, false);
    assert.equal((await matchesCreatorToken(raw, bad)).ok, false);
  }
});

/** Tiny fake D1 that understands just the statements the migrations use. */
function fakeDb(rows) {
  return {
    rows,
    prepare(sql) {
      const stmt = { sql, args: [] };
      stmt.bind = (...a) => { stmt.args = a; return stmt; };
      stmt.all = async () => {
        if (/length\(creator_token\) != 64/.test(sql)) return { results: rows.filter((r) => r.creator_token && r.creator_token.length !== 64).slice(0, stmt.args[0]) };
        if (/totp_secret NOT LIKE/.test(sql)) return { results: rows.filter((r) => r.totp_secret && !r.totp_secret.startsWith('v1:')).slice(0, stmt.args[0]) };
        return { results: [] };
      };
      stmt.run = async () => {
        if (/SET creator_token/.test(sql)) { const [hash, token, old] = stmt.args; const r = rows.find((x) => x.token === token && x.creator_token === old); if (r) r.creator_token = hash; }
        if (/SET totp_secret/.test(sql)) { const [sealed, token, old] = stmt.args; const r = rows.find((x) => x.token === token && x.totp_secret === old); if (r) r.totp_secret = sealed; }
        return { meta: { changes: 1 } };
      };
      return stmt;
    },
  };
}

test('creator tokens: upgrade and the batch job replace raw values with hashes, once', async () => {
  const db = fakeDb([
    { token: 'm1', creator_token: 'raw-token-one-0123456789abcdef012' },
    { token: 'm2', creator_token: await hashCreatorToken('already') },
    { token: 'm3', creator_token: 'raw-token-three-0123456789abcdef0' },
  ]);
  await upgradeCreatorToken(db, 'm1', 'raw-token-one-0123456789abcdef012');
  assert.equal(db.rows[0].creator_token, await hashCreatorToken('raw-token-one-0123456789abcdef012'));
  assert.equal(await migrateLegacyCreatorTokens(db), 1);                       // only m3 was still raw
  assert.ok(db.rows.every((r) => isHashedCreatorToken(r.creator_token)));
  assert.equal(await migrateLegacyCreatorTokens(db), 0);                       // idempotent
});

test('TOTP secrets: encrypted with AES-GCM, round-trip, and nothing readable is stored', async () => {
  const sealed = await sealSecret(env, 'JBSWY3DPEHPK3PXP', 'msg-token');
  assert.ok(isSealed(sealed));
  assert.match(sealed, /^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  assert.ok(!sealed.includes('JBSWY3DPEHPK3PXP'));
  assert.equal(await openSecret(env, sealed, 'msg-token'), 'JBSWY3DPEHPK3PXP');
  assert.notEqual(await sealSecret(env, 'JBSWY3DPEHPK3PXP', 'msg-token'), sealed, 'fresh IV every time');
});

test('TOTP secrets: tampering, a different row, or the wrong key all fail (never a wrong answer)', async () => {
  const sealed = await sealSecret(env, 'SECRETSECRET', 'row-A');
  await assert.rejects(() => openSecret(env, sealed, 'row-B'));                              // moved to another message
  await assert.rejects(() => openSecret({ TOTP_ENCRYPTION_KEY: 'other-key' }, sealed, 'row-A'));
  const [, iv, ct] = sealed.split(':');
  const flipped = Buffer.from(ct, 'base64'); flipped[0] ^= 1;
  await assert.rejects(() => openSecret(env, `v1:${iv}:${flipped.toString('base64')}`, 'row-A'));
  await assert.rejects(() => openSecret({}, sealed, 'row-A'), /not configured/);              // encrypted but no key
  await assert.rejects(() => openSecret(env, 'v1:onlyonepart', 'row-A'), /malformed/);
});

test('TOTP secrets: legacy plaintext still opens, and with no key nothing is encrypted', async () => {
  assert.equal(await openSecret(env, 'PLAINLEGACYSECRET', 'x'), 'PLAINLEGACYSECRET');
  assert.equal(await sealSecret({}, 'SECRET', 'x'), 'SECRET');
  assert.equal(await openSecret(env, null, 'x'), null);
  assert.equal(await sealSecret(env, null, 'x'), null);
});

// A legacy (unencrypted) TOTP secret, random per run
const LEGACY_TOTP = crypto.randomBytes(8).toString('hex').toUpperCase();

test('TOTP secrets: the batch job encrypts legacy rows only when a key exists', async () => {
  const mk = () => fakeDb([{ token: 'a', totp_secret: LEGACY_TOTP }, { token: 'b', totp_secret: null }, { token: 'c', totp_secret: 'v1:x:y' }]);
  const noKey = mk();
  assert.equal(await migrateLegacyTotpSecrets({ DB: noKey }), 0);
  assert.equal(noKey.rows[0].totp_secret, LEGACY_TOTP);
  const withKey = mk();
  assert.equal(await migrateLegacyTotpSecrets({ ...env, DB: withKey }), 1);
  assert.ok(isSealed(withKey.rows[0].totp_secret));
  assert.equal(await openSecret(env, withKey.rows[0].totp_secret, 'a'), LEGACY_TOTP);
  assert.equal(withKey.rows[2].totp_secret, 'v1:x:y');
});

/**
 * Encryption at rest for server-held secrets (TOTP secrets), AES-256-GCM.
 *
 *  - Key: the Worker secret TOTP_ENCRYPTION_KEY (any string; SHA-256 turns it into a 256-bit key).
 *  - Format: "v1:<iv>:<ciphertext>" (base64). The message token is bound in as additional authenticated
 *    data, so a ciphertext copied onto another row fails to decrypt.
 *  - Without a key configured values are stored as before (plaintext); a value that is not "v1:" is
 *    treated as legacy plaintext, so both generations work during a rollout. The hourly job encrypts
 *    legacy rows once a key exists (`migrateLegacyTotpSecrets`).
 *  - A "v1:" value with no key (or the wrong one) THROWS: better a failed 2FA check than a wrong one.
 */
const PREFIX = 'v1:';
const enc = new TextEncoder();

const toB64 = (buf) => Buffer.from(buf).toString('base64');
const fromB64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function importKey(secret) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(secret)));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export const isSealed = (stored) => typeof stored === 'string' && stored.startsWith(PREFIX);

export async function sealSecret(env, plaintext, aad) {
  if (!plaintext || !env?.TOTP_ENCRYPTION_KEY) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(String(aad)) },
    await importKey(env.TOTP_ENCRYPTION_KEY),
    enc.encode(plaintext)
  );
  return `${PREFIX}${toB64(iv)}:${toB64(ct)}`;
}

export async function openSecret(env, stored, aad) {
  if (!stored) return null;
  if (!isSealed(stored)) return stored; // legacy plaintext
  if (!env?.TOTP_ENCRYPTION_KEY) throw new Error('TOTP_ENCRYPTION_KEY is not configured but an encrypted secret was found');
  const [ivB64, ctB64] = stored.slice(PREFIX.length).split(':');
  if (!ivB64 || !ctB64) throw new Error('malformed encrypted secret');
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(ivB64), additionalData: enc.encode(String(aad)) },
    await importKey(env.TOTP_ENCRYPTION_KEY),
    fromB64(ctB64)
  );
  return new TextDecoder().decode(pt);
}

/** Hourly job: encrypt a bounded batch of legacy plaintext secrets (only when a key is configured). */
export async function migrateLegacyTotpSecrets(env, limit = 200) {
  if (!env.TOTP_ENCRYPTION_KEY) return 0;
  const rows = await env.DB.prepare(
    `SELECT token, totp_secret FROM messages
     WHERE totp_secret IS NOT NULL AND totp_secret NOT LIKE 'v1:%' LIMIT ?`
  ).bind(limit).all();
  let converted = 0;
  for (const row of rows.results || []) {
    await env.DB.prepare(`UPDATE messages SET totp_secret = ? WHERE token = ? AND totp_secret = ?`)
      .bind(await sealSecret(env, row.totp_secret, row.token), row.token, row.totp_secret).run();
    converted += 1;
  }
  return converted;
}

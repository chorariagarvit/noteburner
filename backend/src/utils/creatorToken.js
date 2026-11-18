/**
 * Creator tokens are bearer secrets (they allow burning a message, reading its audit log and
 * attaching files), so the database stores only their SHA-256 hash: a database leak can't be
 * replayed as a creator. The raw token exists once, in the response to the creator.
 *
 * Rows created before this change hold the raw token. Those keep working (compared directly) and are
 * upgraded to a hash the first time they are used and by the hourly job (`migrateLegacyCreatorTokens`).
 */
import crypto from 'node:crypto';
import { sha256hex } from './password.js';

const HASHED = /^[0-9a-f]{64}$/;

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export const hashCreatorToken = (token) => sha256hex(String(token));
export const isHashedCreatorToken = (stored) => typeof stored === 'string' && HASHED.test(stored);

/** @returns {Promise<{ok: boolean, legacy: boolean}>} legacy = the stored value is still a raw token */
export async function matchesCreatorToken(stored, presented) {
  if (!stored || !presented) return { ok: false, legacy: false };
  if (isHashedCreatorToken(stored)) {
    return { ok: safeEqual(stored, await hashCreatorToken(presented)), legacy: false };
  }
  return { ok: safeEqual(stored, presented), legacy: true };
}

/** Replace a raw stored token by its hash (no-op if it was already upgraded). */
export async function upgradeCreatorToken(db, messageToken, presented) {
  await db.prepare(
    `UPDATE messages SET creator_token = ? WHERE token = ? AND creator_token = ?`
  ).bind(await hashCreatorToken(presented), messageToken, presented).run();
}

/** Hourly job: hash a bounded batch of legacy rows. Returns how many were converted. */
export async function migrateLegacyCreatorTokens(db, limit = 200) {
  const rows = await db.prepare(
    `SELECT token, creator_token FROM messages
     WHERE creator_token IS NOT NULL AND length(creator_token) != 64 LIMIT ?`
  ).bind(limit).all();
  let converted = 0;
  for (const row of rows.results || []) {
    await upgradeCreatorToken(db, row.token, row.creator_token);
    converted += 1;
  }
  return converted;
}

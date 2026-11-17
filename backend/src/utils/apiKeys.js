import { sha256hex } from './password.js';

/**
 * Look up an active API key. Keys are stored as SHA-256 hashes (see routes/api-keys.js);
 * the raw key is never compared or stored.
 * @returns {Promise<{id:string,user_id:string}|null>}
 */
export async function findActiveApiKey(db, rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  return (await db.prepare('SELECT id, user_id FROM api_keys WHERE key = ? AND active = 1')
    .bind(await sha256hex(rawKey)).first()) || null;
}

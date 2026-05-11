/**
 * Utility functions for message route operations
 */

// Explicit column list — intentionally excludes totp_secret to prevent accidental exposure
const MESSAGE_COLUMNS = `
  token, encrypted_data, iv, salt, expires_at, created_at, accessed,
  custom_slug, creator_token, max_views, view_count, max_password_attempts,
  require_2fa, require_geo_match, creator_country, auto_burn_suspicious,
  media_files, group_id
`;

/**
 * Get message by identifier (token or slug)
 * Always tries token lookup first, then falls back to slug — avoids misrouting
 * 32-char slugs that would previously be treated as tokens.
 * @param {Object} db - Database instance
 * @param {string} identifier - Token or custom slug
 * @returns {Promise<Object|null>} - Message object or null
 */
export async function getMessageByIdentifier(db, identifier) {
  // Try token lookup first
  const byToken = await db.prepare(
    `SELECT ${MESSAGE_COLUMNS} FROM messages WHERE token = ? AND accessed = 0`
  ).bind(identifier).first();

  if (byToken) return byToken;

  // Fall back to slug lookup
  return await db.prepare(
    `SELECT ${MESSAGE_COLUMNS} FROM messages WHERE custom_slug = ? AND accessed = 0`
  ).bind(identifier).first();
}

/**
 * Delete message by identifier (atomically marks as accessed)
 * @param {Object} db - Database instance
 * @param {string} identifier - Token or custom slug
 * @returns {Promise<Object|null>} - Deleted message info or null
 */
export async function deleteMessageByIdentifier(db, identifier) {
  // Try token first
  const byToken = await db.prepare(
    `UPDATE messages SET accessed = 1 WHERE token = ? AND accessed = 0 RETURNING media_files, token, group_id`
  ).bind(identifier).first();

  if (byToken) return byToken;

  // Fall back to slug
  return await db.prepare(
    `UPDATE messages SET accessed = 1 WHERE custom_slug = ? AND accessed = 0 RETURNING media_files, token, group_id`
  ).bind(identifier).first();
}

/**
 * Delete expired message and its media files
 * @param {Object} db - Database instance
 * @param {Object} mediaBucket - R2 bucket instance
 * @param {string} identifier - Token or custom slug
 * @param {Object} message - Message object (must have token and media_files)
 */
export async function deleteExpiredMessage(db, mediaBucket, identifier, message) {
  await db.prepare(`DELETE FROM messages WHERE token = ?`).bind(message.token).run();

  if (message.media_files) {
    const mediaFiles = JSON.parse(message.media_files);
    await Promise.allSettled(mediaFiles.map(fileId => mediaBucket.delete(fileId)));
  }
}

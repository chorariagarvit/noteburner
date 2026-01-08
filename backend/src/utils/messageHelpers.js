/**
 * Utility functions for message route operations
 */

/**
 * Determine if an identifier is a token or custom slug
 * @param {string} identifier - The identifier to check
 * @returns {boolean} - True if token, false if custom slug
 */
export function isTokenIdentifier(identifier) {
  return identifier.length === 32 && /^[A-Za-z0-9_-]+$/.test(identifier);
}

/**
 * Get message by identifier (token or slug)
 * @param {Object} db - Database instance
 * @param {string} identifier - Token or custom slug
 * @returns {Promise<Object|null>} - Message object or null
 */
export async function getMessageByIdentifier(db, identifier) {
  const isToken = isTokenIdentifier(identifier);
  
  if (isToken) {
    return await db.prepare(
      `SELECT * FROM messages WHERE token = ? AND accessed = 0`
    ).bind(identifier).first();
  } else {
    return await db.prepare(
      `SELECT * FROM messages WHERE custom_slug = ? AND accessed = 0`
    ).bind(identifier).first();
  }
}

/**
 * Delete message by identifier
 * @param {Object} db - Database instance
 * @param {string} identifier - Token or custom slug
 * @returns {Promise<Object|null>} - Deleted message info or null
 */
export async function deleteMessageByIdentifier(db, identifier) {
  const isToken = isTokenIdentifier(identifier);
  
  if (isToken) {
    return await db.prepare(
      `UPDATE messages SET accessed = 1 WHERE token = ? AND accessed = 0 RETURNING media_files, token`
    ).bind(identifier).first();
  } else {
    return await db.prepare(
      `UPDATE messages SET accessed = 1 WHERE custom_slug = ? AND accessed = 0 RETURNING media_files, token`
    ).bind(identifier).first();
  }
}

/**
 * Delete expired message and its media files
 * @param {Object} db - Database instance
 * @param {Object} mediaBucket - R2 bucket instance
 * @param {string} identifier - Token or custom slug
 * @param {Object} message - Message object
 */
export async function deleteExpiredMessage(db, mediaBucket, identifier, message) {
  const isToken = isTokenIdentifier(identifier);
  
  // Delete message from database
  const deleteQuery = isToken 
    ? `DELETE FROM messages WHERE token = ?`
    : `DELETE FROM messages WHERE custom_slug = ?`;
  await db.prepare(deleteQuery).bind(identifier).run();

  // Delete associated media files
  if (message.media_files) {
    const mediaFiles = JSON.parse(message.media_files);
    for (const fileId of mediaFiles) {
      await mediaBucket.delete(fileId);
    }
  }
}

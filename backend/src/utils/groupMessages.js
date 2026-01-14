import { nanoid } from 'nanoid';

/**
 * Create a group message with multiple recipient links
 * @param {Object} db - D1 database instance
 * @param {Object} messageData - Message data (encryptedData, iv, salt, etc.)
 * @param {Object} groupOptions - Group options (recipientCount, maxViews, burnOnFirstView)
 * @returns {Promise<Object>} - Group details with all recipient links
 */
export async function createGroupMessage(db, messageData, groupOptions) {
  const {
    encryptedData,
    iv,
    salt,
    expiresIn,
    recipientCount = 1,
    maxViews = null,
    burnOnFirstView = false
  } = { ...messageData, ...groupOptions };

  if (recipientCount < 1 || recipientCount > 100) {
    throw new Error('Recipient count must be between 1 and 100');
  }

  const groupId = nanoid(16);
  const createdAt = Date.now();
  const expiresAt = expiresIn ? createdAt + (expiresIn * 1000) : null;

  // Create group metadata
  await db.prepare(
    `INSERT INTO message_groups (group_id, created_at, total_links, accessed_count, max_views, burn_on_first_view, expires_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`
  ).bind(
    groupId,
    createdAt,
    recipientCount,
    maxViews,
    burnOnFirstView ? 1 : 0,
    expiresAt
  ).run();

  // Generate unique tokens for each recipient
  const recipientLinks = [];
  
  for (let i = 0; i < recipientCount; i++) {
    const token = nanoid(32);
    
    // Create individual message with group_id reference
    await db.prepare(
      `INSERT INTO messages (token, encrypted_data, iv, salt, created_at, expires_at, accessed, group_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(token, encryptedData, iv, salt, createdAt, expiresAt, groupId).run();

    recipientLinks.push({
      recipientIndex: i + 1,
      token
    });
  }

  return {
    groupId,
    recipientCount,
    links: recipientLinks,
    expiresAt,
    burnOnFirstView,
    maxViews
  };
}

/**
 * Get group message info
 * @param {Object} db - D1 database instance
 * @param {string} groupId - Group ID
 * @returns {Promise<Object|null>} - Group info or null
 */
export async function getGroupInfo(db, groupId) {
  const result = await db.prepare(
    'SELECT * FROM message_groups WHERE group_id = ?'
  ).bind(groupId).first();

  return result;
}

/**
 * Increment group access count and check if all messages should burn
 * @param {Object} db - D1 database instance
 * @param {string} groupId - Group ID
 * @returns {Promise<boolean>} - True if all group messages should be deleted
 */
export async function incrementGroupAccess(db, groupId) {
  const group = await getGroupInfo(db, groupId);
  
  if (!group) {
    return false;
  }

  const newAccessCount = group.accessed_count + 1;

  // Update access count
  await db.prepare(
    'UPDATE message_groups SET accessed_count = ? WHERE group_id = ?'
  ).bind(newAccessCount, groupId).run();

  // Check if we should burn all messages
  const shouldBurn = 
    group.burn_on_first_view === 1 || 
    (group.max_views && newAccessCount >= group.max_views);

  if (shouldBurn) {
    // Delete all messages in the group
    await db.prepare(
      'DELETE FROM messages WHERE group_id = ?'
    ).bind(groupId).run();

    // Delete group metadata
    await db.prepare(
      'DELETE FROM message_groups WHERE group_id = ?'
    ).bind(groupId).run();
  }

  return shouldBurn;
}

/**
 * Cleanup expired group messages
 * @param {Object} db - D1 database instance
 * @returns {Promise<number>} - Number of groups cleaned up
 */
export async function cleanupExpiredGroups(db) {
  const now = Date.now();
  
  // Get expired groups
  const expiredGroups = await db.prepare(
    'SELECT group_id FROM message_groups WHERE expires_at IS NOT NULL AND expires_at <= ?'
  ).bind(now).all();

  if (!expiredGroups.results || expiredGroups.results.length === 0) {
    return 0;
  }

  // Delete messages for each expired group
  for (const group of expiredGroups.results) {
    await db.prepare(
      'DELETE FROM messages WHERE group_id = ?'
    ).bind(group.group_id).run();
  }

  // Delete expired group metadata
  const result = await db.prepare(
    'DELETE FROM message_groups WHERE expires_at IS NOT NULL AND expires_at <= ?'
  ).bind(now).run();

  return result.changes || 0;
}

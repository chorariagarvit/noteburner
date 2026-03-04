/**
 * Cloudflare KV Cache Utility
 * Week 12 - Performance Optimization
 * 
 * Implements caching layer to reduce D1 database load
 * Uses Cloudflare KV for hot message caching
 */

/**
 * Cache TTL settings (in seconds)
 */
export const CACHE_TTL = {
  MESSAGE_METADATA: 300,      // 5 minutes for message metadata
  MESSAGE_CONTENT: 60,         // 1 minute for message content (short-lived)
  STATS: 60,                   // 1 minute for platform stats
  TEAM_DATA: 300,              // 5 minutes for team info
  USER_SESSION: 1800,          // 30 minutes for session data
  API_KEY: 3600,               // 1 hour for API key validation
};

/**
 * Cache key prefixes for organization
 */
const CACHE_PREFIX = {
  MESSAGE: 'msg:',
  STATS: 'stats:',
  TEAM: 'team:',
  SESSION: 'session:',
  API_KEY: 'apikey:',
  USER: 'user:',
};

/**
 * Get data from cache
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached data or null if not found/expired
 */
export async function getCache(kv, key) {
  if (!kv) {
    console.warn('KV namespace not configured, skipping cache read');
    return null;
  }

  try {
    const cached = await kv.get(key, { type: 'json' });
    if (cached) {
      console.log(`Cache HIT: ${key}`);
      return cached;
    }
    console.log(`Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error(`Cache read error for ${key}:`, error);
    return null;
  }
}

/**
 * Set data in cache with TTL
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<void>}
 */
export async function setCache(kv, key, value, ttl = 300) {
  if (!kv) {
    console.warn('KV namespace not configured, skipping cache write');
    return;
  }

  try {
    await kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
    });
    console.log(`Cache SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`Cache write error for ${key}:`, error);
    // Don't throw - cache failures shouldn't break the app
  }
}

/**
 * Delete data from cache (invalidation)
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} key - Cache key
 * @returns {Promise<void>}
 */
export async function deleteCache(kv, key) {
  if (!kv) {
    return;
  }

  try {
    await kv.delete(key);
    console.log(`Cache DELETE: ${key}`);
  } catch (error) {
    console.error(`Cache delete error for ${key}:`, error);
  }
}

/**
 * Delete multiple cache keys (batch invalidation)
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string[]} keys - Array of cache keys
 * @returns {Promise<void>}
 */
export async function deleteCacheBatch(kv, keys) {
  if (!kv || !keys || keys.length === 0) {
    return;
  }

  try {
    await Promise.all(keys.map(key => deleteCache(kv, key)));
    console.log(`Cache BATCH DELETE: ${keys.length} keys`);
  } catch (error) {
    console.error('Cache batch delete error:', error);
  }
}

/**
 * Cache-aside pattern: Get from cache or fetch from source
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if cache miss
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Data from cache or source
 */
export async function cacheAside(kv, key, fetchFn, ttl = 300) {
  // Try cache first
  const cached = await getCache(kv, key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  const data = await fetchFn();
  
  // Store in cache for next time
  if (data !== null && data !== undefined) {
    await setCache(kv, key, data, ttl);
  }

  return data;
}

/**
 * Helper: Generate message cache key
 * @param {string} messageId - Message ID
 * @returns {string} Cache key
 */
export function getMessageCacheKey(messageId) {
  return `${CACHE_PREFIX.MESSAGE}${messageId}`;
}

/**
 * Helper: Generate stats cache key
 * @param {string} type - Stats type (daily, weekly, alltime)
 * @returns {string} Cache key
 */
export function getStatsCacheKey(type = 'alltime') {
  return `${CACHE_PREFIX.STATS}${type}`;
}

/**
 * Helper: Generate team cache key
 * @param {string} teamId - Team ID
 * @returns {string} Cache key
 */
export function getTeamCacheKey(teamId) {
  return `${CACHE_PREFIX.TEAM}${teamId}`;
}

/**
 * Helper: Generate session cache key
 * @param {string} sessionToken - Session token
 * @returns {string} Cache key
 */
export function getSessionCacheKey(sessionToken) {
  return `${CACHE_PREFIX.SESSION}${sessionToken}`;
}

/**
 * Helper: Generate API key cache key
 * @param {string} apiKey - API key
 * @returns {string} Cache key
 */
export function getApiKeyCacheKey(apiKey) {
  return `${CACHE_PREFIX.API_KEY}${apiKey}`;
}

/**
 * Helper: Generate user cache key
 * @param {string} userId - User ID
 * @returns {string} Cache key
 */
export function getUserCacheKey(userId) {
  return `${CACHE_PREFIX.USER}${userId}`;
}

/**
 * Invalidate all caches for a message
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} messageId - Message ID
 * @returns {Promise<void>}
 */
export async function invalidateMessageCache(kv, messageId) {
  const key = getMessageCacheKey(messageId);
  await deleteCache(kv, key);
}

/**
 * Invalidate all stats caches
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @returns {Promise<void>}
 */
export async function invalidateStatsCache(kv) {
  const keys = [
    getStatsCacheKey('daily'),
    getStatsCacheKey('weekly'),
    getStatsCacheKey('alltime'),
  ];
  await deleteCacheBatch(kv, keys);
}

/**
 * Invalidate team cache
 * @param {KVNamespace} kv - Cloudflare KV namespace binding
 * @param {string} teamId - Team ID
 * @returns {Promise<void>}
 */
export async function invalidateTeamCache(kv, teamId) {
  const keys = [
    getTeamCacheKey(teamId),
    `${CACHE_PREFIX.TEAM}${teamId}:members`,
    `${CACHE_PREFIX.TEAM}${teamId}:messages`,
    `${CACHE_PREFIX.TEAM}${teamId}:stats`,
  ];
  await deleteCacheBatch(kv, keys);
}

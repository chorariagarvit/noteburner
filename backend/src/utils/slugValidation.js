// Custom URL slug validation and sanitization

// Common profanity list (basic filter)
const PROFANITY_LIST = [
  'fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard', 'crap',
  'dick', 'piss', 'cunt', 'slut', 'whore', 'fag', 'nazi',
  'porn', 'sex', 'nude', 'xxx', 'penis', 'vagina'
];

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'api', 'admin', 'login', 'signup', 'logout', 'settings',
  'about', 'help', 'support', 'contact', 'privacy', 'terms',
  'm', 'message', 'messages', 'media', 'stats', 'health',
  'test', 'demo', 'example', 'null', 'undefined'
];

/**
 * Validate custom URL slug
 * @param {string} slug - The custom slug to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateSlug(slug) {
  // Check if slug is provided
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug is required' };
  }

  // Trim whitespace
  slug = slug.trim();

  // Check length (3-20 characters)
  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters long' };
  }
  
  if (slug.length > 20) {
    return { valid: false, error: 'Slug must be 20 characters or less' };
  }

  // Check format (alphanumeric, hyphens, underscores only)
  const validFormat = /^[a-zA-Z0-9_-]+$/;
  if (!validFormat.test(slug)) {
    return { valid: false, error: 'Slug can only contain letters, numbers, hyphens, and underscores' };
  }

  // Must start with a letter or number
  if (!/^[a-zA-Z0-9]/.test(slug)) {
    return { valid: false, error: 'Slug must start with a letter or number' };
  }

  // Check for reserved slugs
  const lowerSlug = slug.toLowerCase();
  if (RESERVED_SLUGS.includes(lowerSlug)) {
    return { valid: false, error: 'This slug is reserved and cannot be used' };
  }

  // Check for profanity
  if (containsProfanity(lowerSlug)) {
    return { valid: false, error: 'Slug contains inappropriate content' };
  }

  return { valid: true };
}

/**
 * Check if text contains profanity
 * @param {string} text - Text to check
 * @returns {boolean} True if profanity found
 */
function containsProfanity(text) {
  const lowerText = text.toLowerCase();
  
  // Check for exact matches and variations
  for (const word of PROFANITY_LIST) {
    // Exact match
    if (lowerText === word) return true;
    
    // Contains word with word boundaries
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) return true;
    
    // Check for leetspeak variations (4 for a, 3 for e, etc.)
    const leetWord = word
      .replace(/a/g, '[a4@]')
      .replace(/e/g, '[e3]')
      .replace(/i/g, '[i1!]')
      .replace(/o/g, '[o0]')
      .replace(/s/g, '[s5$]')
      .replace(/t/g, '[t7]');
    
    const leetRegex = new RegExp(leetWord, 'i');
    if (leetRegex.test(lowerText)) return true;
  }
  
  return false;
}

/**
 * Sanitize slug (remove invalid characters, convert to lowercase)
 * @param {string} slug - Raw slug input
 * @returns {string} Sanitized slug
 */
export function sanitizeSlug(slug) {
  if (!slug) return '';
  
  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^a-z0-9_-]/g, '')    // Remove invalid characters
    .replace(/--+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')        // Remove leading/trailing hyphens
    .slice(0, 20);                  // Limit to 20 characters
}

/**
 * Generate a random slug (fallback when custom slug not provided)
 * @param {number} length - Length of slug (default 8)
 * @returns {string} Random slug
 */
export function generateRandomSlug(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  
  // First character must be a letter
  slug += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  
  // Remaining characters
  for (let i = 1; i < length; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return slug;
}

/**
 * Check if slug is available (backend use)
 * @param {Object} db - Database instance
 * @param {string} slug - Slug to check
 * @returns {Promise<boolean>} True if available
 */
export async function isSlugAvailable(db, slug) {
  if (!slug) return false;
  
  const result = await db.prepare(
    'SELECT token FROM messages WHERE custom_slug = ? LIMIT 1'
  ).bind(slug).first();
  
  return !result; // Available if no result found
}

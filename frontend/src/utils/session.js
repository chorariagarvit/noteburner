/**
 * Session token utilities
 * Handles retrieval of session token from either localStorage or sessionStorage
 */

/**
 * Get session token from storage
 * Checks localStorage first (remember me), then sessionStorage
 * @returns {string|null} Session token or null if not found
 */
export function getSessionToken() {
  return localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
}

/**
 * Get headers with session token for authenticated API requests
 * @returns {Object} Headers object with X-Session-Token
 */
export function getAuthHeaders() {
  const sessionToken = getSessionToken();
  return {
    'X-Session-Token': sessionToken || ''
  };
}

/**
 * Get headers with session token and content type for authenticated API requests
 * @returns {Object} Headers object with X-Session-Token and Content-Type
 */
export function getAuthHeadersWithJSON() {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  };
}

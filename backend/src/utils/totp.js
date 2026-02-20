/**
 * TOTP (Time-based One-Time Password) Utility
 * Implements RFC 6238 standard for 2FA authentication
 */

import crypto from 'crypto';

// Base32 encoding lookup table
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret for TOTP
 * @param {number} length - Length of the secret (default: 32 characters)
 * @returns {string} Base32-encoded secret
 */
export function generateTOTPSecret(length = 32) {
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[Math.floor(Math.random() * BASE32_CHARS.length)];
  }
  return secret;
}

/**
 * Decode Base32 string to buffer
 * @param {string} base32 - Base32 encoded string
 * @returns {Buffer} Decoded buffer
 */
function base32Decode(base32) {
  const cleanedBase32 = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  
  for (const char of cleanedBase32) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  
  const buffer = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    buffer.push(parseInt(bits.slice(i, i + 8), 2));
  }
  
  return Buffer.from(buffer);
}

/**
 * Generate TOTP code for given secret and time
 * @param {string} secret - Base32 encoded secret
 * @param {number} time - Unix timestamp (default: current time)
 * @param {number} window - Time window in seconds (default: 30)
 * @returns {string} 6-digit TOTP code
 */
export function generateTOTP(secret, time = Date.now(), window = 30) {
  const epoch = Math.floor(time / 1000);
  const timeStep = Math.floor(epoch / window);
  
  // Convert time step to 8-byte buffer (big-endian)
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));
  
  // Decode the Base32 secret
  const key = base32Decode(secret);
  
  // Generate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  );
  
  // Return 6-digit code
  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verify TOTP code against secret
 * @param {string} code - 6-digit code to verify
 * @param {string} secret - Base32 encoded secret
 * @param {number} window - Number of time windows to check (default: 1)
 * @returns {boolean} True if code is valid
 */
export function verifyTOTP(code, secret, window = 1) {
  const now = Date.now();
  const timeWindow = 30000; // 30 seconds in milliseconds
  
  // Check current window and adjacent windows to account for clock drift
  for (let i = -window; i <= window; i++) {
    const testTime = now + (i * timeWindow);
    const testCode = generateTOTP(secret, testTime);
    
    if (testCode === code) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate TOTP provisioning URI for QR code
 * @param {string} secret - Base32 encoded secret
 * @param {string} label - Account label (e.g., "MessageID:abc123")
 * @param {string} issuer - Service name (default: "NoteBurner")
 * @returns {string} otpauth:// URI
 */
export function generateTOTPUri(secret, label, issuer = 'NoteBurner') {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  });
  
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params}`;
}

/**
 * Generate QR code data URL for TOTP URI
 * @param {string} totpUri - TOTP provisioning URI
 * @returns {string} Data URL for QR code SVG
 */
export function generateQRCodeSVG(totpUri) {
  // Simple QR code SVG generator (limited to small data)
  // For production, consider using a proper QR library
  // This returns a base64-encoded data URI that can be embedded
  const encodedUri = encodeURIComponent(totpUri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedUri}`;
}

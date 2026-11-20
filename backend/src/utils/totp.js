/**
 * TOTP (Time-based One-Time Password) Utility
 * Implements RFC 6238 standard for 2FA authentication
 */

import crypto from 'node:crypto';

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Base32 encoding lookup table
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret for TOTP
 * @param {number} length - Length of the secret (default: 32 characters)
 * @returns {string} Base32-encoded secret
 */
export function generateTOTPSecret(length = 32) {
  // Rejection-free: 256 % 32 === 0, so masking a random byte gives uniform base32 chars
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let secret = '';
  for (const byte of bytes) {
    secret += BASE32_CHARS[byte & 31];
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
    buffer.push(Number.parseInt(bits.slice(i, i + 8), 2));
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
  let valid = false;

  // Check every window (no early exit) with constant-time comparison
  for (let i = -window; i <= window; i++) {
    const testCode = generateTOTP(secret, now + (i * timeWindow));
    if (safeEqual(testCode, code)) {
      valid = true;
    }
  }

  return valid;
}

const PROOF_TTL_MS = 10 * 60 * 1000;

/**
 * Create a short-lived proof that a TOTP code was verified for a message.
 * HMAC keyed with the message's TOTP secret (server-side only), so it cannot be forged.
 * @returns {string} "<expiry>.<hex hmac>"
 */
export function createTotpProof(secret, identifier, ttlMs = PROOF_TTL_MS) {
  const expiry = Date.now() + ttlMs;
  const mac = crypto.createHmac('sha256', secret).update(`${identifier}:${expiry}`).digest('hex');
  return `${expiry}.${mac}`;
}

/**
 * Verify a proof produced by createTotpProof.
 */
export function verifyTotpProof(proof, secret, identifier) {
  if (!proof || typeof proof !== 'string' || !secret) return false;
  const [expiryStr, mac] = proof.split('.');
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || !mac || Date.now() > expiry) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${identifier}:${expiry}`).digest('hex');
  return safeEqual(mac, expected);
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

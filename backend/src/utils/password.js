/**
 * Password hashing and validation utilities
 * Uses bcryptjs for compatibility with Cloudflare Workers
 */

import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const SALT_ROUNDS = 10;

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/
};

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid and errors array
 */
export function validatePasswordStrength(password) {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (!PASSWORD_PATTERNS.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!PASSWORD_PATTERNS.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!PASSWORD_PATTERNS.number.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special character is optional but recommended
  const hasSpecial = PASSWORD_PATTERNS.special.test(password);
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
    hasSpecial
  };
}

/**
 * Calculate password strength score (0-4)
 * @param {string} password - Password to evaluate
 * @returns {number} - Strength score
 */
function calculatePasswordStrength(password) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (PASSWORD_PATTERNS.uppercase.test(password) && PASSWORD_PATTERNS.lowercase.test(password)) score++;
  if (PASSWORD_PATTERNS.number.test(password)) score++;
  if (PASSWORD_PATTERNS.special.test(password)) score++;

  return Math.min(score, 4); // Cap at 4
}

/**
 * Generate a secure random token for password reset
 * @returns {string} - Random 32-character token
 */
export function generateResetToken() {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const nanoid = customAlphabet(alphabet, 32);
  return nanoid();
}

/**
 * Generate a secure email verification token
 * @returns {string} - Random 32-character token
 */
export function generateVerificationToken() {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const nanoid = customAlphabet(alphabet, 32);
  return nanoid();
}

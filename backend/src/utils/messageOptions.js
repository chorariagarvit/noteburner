/**
 * Shared validation helpers for creating messages (used by /api/messages and /api/v1/messages),
 * so both entry points enforce identical rules.
 */

export const MAX_EXPIRY_SECONDS = 30 * 24 * 3600; // 30 days
export const MAX_ENCRYPTED_CHARS = Math.floor(1.4 * 1024 * 1024); // keeps rows under D1's 2 MB limit

export const clampInt = (value, min, max, fallback) => {
  const n = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
};

// -1 means "unlimited" (the UI offers it); anything else is clamped to 1..10
export const limitOrUnlimited = (value, fallback) => {
  const n = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return n === -1 ? -1 : clampInt(value, 1, 10, fallback);
};

export const flag = (v) => (v === true || v === 1 || v === '1' ? 1 : 0);

/** iv and salt must each be 16 bytes: 24 base64 chars (or 16 raw chars). */
export const validIvOrSalt = (v) => typeof v === 'string' && (v.length === 16 || v.length === 24);

// CORS configuration - Restrict to trusted origins only
// In production, replace with your actual frontend domain
export const ALLOWED_ORIGINS = [
  'http://localhost:4173',
  'https://noteburner.pages.dev',
  'https://noteburner.work',
  'https://api.noteburner.work',
  'https://media.noteburner.work',
  'http://localhost:5173',  // Local development
  'http://127.0.0.1:5173'   // Alternative localhost
];

export const corsConfig = {
  origin: (origin, c) => {
    // No Origin header (curl, server-to-server): no CORS headers needed
    if (!origin) return null;

    // Allow Chrome/Firefox extension origins (chrome-extension:// or moz-extension://)
    if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
      return origin;
    }

    // localhost origins are only for non-production environments
    const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    if (isLocal && c?.env?.ENVIRONMENT === 'production') return null;

    // Reject anything not explicitly allowed (no fallback origin)
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Session-Token', 'X-API-Key', 'X-Creator-Token', 'X-TOTP-Proof', 'X-App-Token', 'X-Auth-Tag', 'Authorization'],
  exposeHeaders: ['X-File-IV', 'X-File-Salt', 'X-File-Name', 'Content-Disposition'],
  credentials: false,
};

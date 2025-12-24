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
  origin: (origin) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return true;
    // Check if origin is in allowed list
    return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  },
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  exposeHeaders: ['X-File-IV', 'X-File-Salt', 'X-File-Name', 'Content-Disposition'],
  credentials: false,
};

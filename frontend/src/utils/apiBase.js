// Single source of truth for the API origin.
// Empty string = same-origin (production routes /api/* to the Worker; dev uses the Vite proxy).
import { solveChallenge } from './turnstile';

export const API_BASE = import.meta.env.VITE_API_URL || '';

// ---------------------------------------------------------------------------
// App-token auth: every /api/* call must carry a signed X-App-Token (or a session /
// API key). We fetch a short-lived token from POST /api/app-token and attach it
// transparently to all requests aimed at our API.
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'nb_app_token';
let tokenCache = { token: null, expiresAt: 0 };
try {
  // Reuse the token across page loads in this tab instead of minting one per navigation
  const saved = JSON.parse(globalThis.sessionStorage?.getItem(STORAGE_KEY) || 'null');
  if (saved?.token && saved.expiresAt > Date.now()) tokenCache = saved;
} catch { /* storage unavailable: fall back to memory only */ }
let inflight = null;

async function requestToken(rawFetch, turnstileToken) {
  const res = await rawFetch(`${API_BASE}/api/app-token`, {
    method: 'POST',
    ...(turnstileToken ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turnstileToken }) } : {}),
  });
  if (res.ok) return res.json();

  // The server may ask for a human check first (Turnstile): solve it once and retry
  if (res.status === 403 && !turnstileToken) {
    const body = await res.json().catch(() => ({}));
    if (body.code === 'CHALLENGE_REQUIRED' && body.siteKey) {
      return requestToken(rawFetch, await solveChallenge(body.siteKey));
    }
  }
  throw new Error(`app-token HTTP ${res.status}`);
}

async function getAppToken(rawFetch, force = false) {
  if (!force && tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }
  if (!inflight) {
    inflight = requestToken(rawFetch)
      .then(({ token, expiresAt }) => {
        tokenCache = { token, expiresAt };
        try { globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(tokenCache)); } catch { /* ignore */ }
        return token;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function installApiAuth() {
  if (globalThis.__nbApiAuthInstalled) return;
  globalThis.__nbApiAuthInstalled = true;
  const rawFetch = globalThis.fetch.bind(globalThis);
  const apiPrefix = `${API_BASE}/api/`;
  const origin = globalThis.location?.origin || '';

  const isApiCall = (url) =>
    url.startsWith(apiPrefix) || (API_BASE === '' && url.startsWith(`${origin}/api/`));

  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input?.url || input?.href || '');
    if (!isApiCall(url) || url.endsWith('/api/app-token')) {
      return rawFetch(input, init);
    }

    const send = async (force) => {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
      // Callers that already authenticate (session / API key) don't need an anonymous app token
      const alreadyAuthenticated = headers.has('X-Session-Token') || headers.has('Authorization') || headers.has('X-API-Key');
      if (!alreadyAuthenticated) {
        try {
          headers.set('X-App-Token', await getAppToken(rawFetch, force));
        } catch {
          // Could not get a token (offline, request cancelled by a navigation, server down). Don't turn
          // that into an uncaught rejection: send the request anyway so callers see a normal response
          // (401 if the server is up) or the usual network error, exactly as before the gate existed.
        }
      }
      return rawFetch(input, { ...init, headers });
    };

    let response = await send(false);
    if (response.status === 401) {
      // Token expired/invalid: refresh once and retry (only if it was our token that failed)
      const body = await response.clone().json().catch(() => ({}));
      if (body.code === 'APP_TOKEN_INVALID') {
        try { globalThis.sessionStorage?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        response = await send(true);
      }
    }
    return response;
  };
}

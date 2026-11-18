/**
 * Cloudflare Turnstile verification for the anonymous app-token endpoint.
 *
 * Opt-in: the challenge is required only when TURNSTILE_SECRET_KEY is configured (a Worker secret).
 * TURNSTILE_SITE_KEY (a plain var, public by design) is handed to the frontend when it is asked to
 * solve a challenge, so there is a single place to configure both.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048; // documented upper bound for a Turnstile response token

export const challengeEnabled = (env) => !!env.TURNSTILE_SECRET_KEY;

/**
 * @returns {Promise<{ok: boolean, reason?: string}>}
 * Throws if Cloudflare's verification service cannot be reached (the caller answers 503, retryable).
 */
export async function verifyTurnstile(env, token, remoteIp, fetchImpl = fetch) {
  if (!challengeEnabled(env)) return { ok: true };
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'missing-or-malformed-token' };
  }

  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (remoteIp && remoteIp !== 'unknown') form.set('remoteip', remoteIp);

  const res = await fetchImpl(env.TURNSTILE_VERIFY_URL || VERIFY_URL, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Turnstile verification responded ${res.status}`);
  const result = await res.json();
  return result.success
    ? { ok: true }
    : { ok: false, reason: (result['error-codes'] || ['rejected']).join(',') };
}

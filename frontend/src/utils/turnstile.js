/**
 * Cloudflare Turnstile helper. Only used when the server answers a token request with
 * 403 CHALLENGE_REQUIRED (it is off by default). The widget uses `interaction-only` appearance, so
 * most visitors never see anything; a small box appears bottom-right only when a human check is needed.
 */
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SOLVE_TIMEOUT_MS = 90_000;

let scriptPromise = null;

function loadScript() {
  if (globalThis.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      // No integrity hash: Cloudflare changes api.js without notice, so a pinned hash would break the check. The CSP limits the origin.
      const el = document.createElement('script');
      el.src = SCRIPT_URL;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => { scriptPromise = null; reject(new Error('Could not load the verification widget')); };
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

/** Show the widget, resolve with a solved token, always clean up. */
export async function solveChallenge(siteKey) {
  if (!siteKey) throw new Error('Verification is required but not configured');
  await loadScript();

  return new Promise((resolve, reject) => {
    const box = document.createElement('div');
    box.setAttribute('data-testid', 'turnstile-box');
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000;';
    document.body.appendChild(box);

    let widgetId;
    const finish = (fn, value) => {
      clearTimeout(timer);
      try { if (widgetId !== undefined) globalThis.turnstile.remove(widgetId); } catch { /* ignore */ }
      box.remove();
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('Verification timed out')), SOLVE_TIMEOUT_MS);

    try {
      widgetId = globalThis.turnstile.render(box, {
        sitekey: siteKey,
        appearance: 'interaction-only',
        callback: (token) => finish(resolve, token),
        'error-callback': () => finish(reject, new Error('Verification failed')),
        'expired-callback': () => finish(reject, new Error('Verification expired')),
      });
    } catch (err) {
      finish(reject, err);
    }
  });
}

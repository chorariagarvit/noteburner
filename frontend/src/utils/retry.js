/**
 * Retry for requests that are safe to repeat.
 *
 * Only use this for reads that change nothing on the server (metadata, slug checks). Never wrap a call that
 * claims a view, creates a message or uploads data: repeating those could burn a message or create a duplicate.
 */
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
});

/**
 * fetch() that tries again after a network failure or a 502/503/504, waiting a little longer each time.
 * Any other response (including 404, 410 and 429) is returned straight away: those are real answers.
 */
export async function fetchWithRetry(url, init = {}, { retries = 2, baseDelayMs = 400, fetchImpl = globalThis.fetch } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === retries) return response;
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
      if (attempt === retries) throw lastError;
    }
    await wait(baseDelayMs * 2 ** attempt, init.signal);
  }
  throw lastError;
}

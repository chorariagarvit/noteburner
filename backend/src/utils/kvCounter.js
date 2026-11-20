/**
 * Fixed-window counter on Workers KV.
 *
 * Value format: "<count>|<resetAtEpochSeconds>". The window end is stored in the value so
 * later writes can keep the ORIGINAL expiry. (A KV put without expiration/expirationTtl
 * removes any existing expiry, which previously made counters permanent.)
 * KV needs expirations >= 60s in the future; the logical window is enforced via resetAt.
 */
export async function readCounter(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return { count: 0, resetAt: 0 };
  const [countStr, resetStr] = raw.split('|');
  const count = Number.parseInt(countStr, 10) || 0;
  const resetAt = Number.parseInt(resetStr, 10) || 0;
  if (!resetAt || resetAt <= Date.now() / 1000) return { count: 0, resetAt: 0 }; // window over
  return { count, resetAt };
}

export async function bumpCounter(kv, key, current, windowSeconds) {
  const nowSec = Math.floor(Date.now() / 1000);
  const resetAt = current.count === 0 ? nowSec + windowSeconds : current.resetAt;
  await kv.put(key, `${current.count + 1}|${resetAt}`, {
    expiration: Math.max(resetAt, nowSec + 60)
  });
  return { count: current.count + 1, resetAt };
}

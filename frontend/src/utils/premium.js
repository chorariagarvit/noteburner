/**
 * Frontend utility for checking and caching premium status.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';
const CACHE_KEY = 'noteburner_premium_status';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch and cache the current user's premium status.
 * Returns null if unauthenticated or request fails.
 */
export async function getPremiumStatus(token, { force = false } = {}) {
  if (!token) return null;

  if (!force) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached._ts < CACHE_TTL) {
        return cached;
      }
    } catch (_) {}
  }

  try {
    const res = await fetch(`${API_BASE}/api/premium/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = { ...data, _ts: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
    return result;
  } catch (_) {
    return null;
  }
}

/** Clear the cached premium status (e.g. after subscribing or cancelling). */
export function clearPremiumCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

/** Returns true if the user has an active premium or lifetime subscription. */
export function isPremium(status) {
  if (!status) return false;
  const planId = status?.subscription?.plan_id;
  const active = status?.subscription?.status === 'active';
  return active && (planId === 'premium' || planId === 'lifetime');
}

/** Returns the file size limit in bytes based on the current plan. */
export function getFileSizeLimit(status) {
  return status?.plan?.file_size_limit ?? 104857600; // default 100MB
}

/** Returns the custom URL limit based on the current plan (-1 = unlimited). */
export function getCustomUrlsLimit(status) {
  return status?.plan?.custom_urls_limit ?? 5;
}

/** Returns the plan display name. */
export function getPlanName(status) {
  const id = status?.subscription?.plan_id || 'free';
  const map = { free: 'Free', premium: 'Premium', lifetime: 'Lifetime' };
  return map[id] || id;
}

/**
 * Server-side enforcement of the per-message protections offered in the UI:
 *
 *  - require_geo_match: only visitors in the sender's country (as seen by Cloudflare) may open the message.
 *  - auto_burn_suspicious: destroy the message at once on suspicious access. "Suspicious" means:
 *      1. an attempt from a blocked country (needs require_geo_match),
 *      2. failed password / 2FA guesses coming from two or more different countries within 10 minutes,
 *      3. access through an anonymizing network (Tor).
 *
 * Privacy-first: only country codes are stored (audit_logs), never IP addresses.
 * The creator (holder of the creator token) is never restricted.
 */
import { readCountry } from './geo.js';
import { deleteExpiredMessage } from './messageHelpers.js';
import { incrementStat } from './stats.js';

const SUSPICION_WINDOW = '-10 minutes';

async function logEvent(c, message, eventType, country, success = false, metadata = null) {
  try {
    await c.env.DB.prepare(
      `INSERT INTO audit_logs (message_id, event_type, country, timestamp, success, metadata)
       VALUES (?, ?, ?, datetime('now'), ?, ?)`
    ).bind(message.token, eventType, country, success ? 1 : 0, metadata ? JSON.stringify(metadata) : null).run();
  } catch (err) {
    console.warn('[protections] audit log failed:', err.message); // never fail the request over logging
  }
}

/**
 * Destroy the message exactly once, even if several suspicious requests arrive together.
 * The winner of the atomic claim responds 410; everyone else sees it as already gone (404).
 */
async function autoBurn(c, message, reason, country) {
  const claimed = await c.env.DB.prepare(
    `UPDATE messages SET accessed = 1 WHERE token = ? AND accessed = 0 RETURNING token`
  ).bind(message.token).first();
  if (!claimed) {
    return c.json({ error: 'Message not found or already accessed' }, 404);
  }
  await deleteExpiredMessage(c.env.DB, c.env.MEDIA_BUCKET, message.token, message);
  await incrementStat(c.env.DB, 'messages_burned');
  await logEvent(c, message, 'auto_burned', country, true, { reason });
  return c.json({
    error: 'This message was destroyed because of suspicious activity.',
    code: 'AUTO_BURNED'
  }, 410);
}

/** Is `country` allowed to open this message? (also tells the client why not) */
export function geoVerdict(c, message) {
  const { country, anonymizer } = readCountry(c);
  if (!message.require_geo_match) return { allowed: true, country, anonymizer };
  return { allowed: !!country && country === message.creator_country, country, anonymizer };
}

/**
 * Checks that must pass before anything about the message is released or changed by a non-creator.
 * Returns a Response to send when the request must stop, or null when it may continue.
 */
export async function denyIfRestricted(c, message) {
  const { country, anonymizer } = readCountry(c);
  const autoBurnEnabled = message.auto_burn_suspicious === 1;

  if (anonymizer && autoBurnEnabled) {
    return autoBurn(c, message, 'Access through an anonymizing network (Tor)', null);
  }

  if (message.require_geo_match && (!country || country !== message.creator_country)) {
    await logEvent(c, message, 'geo_blocked', country);
    if (autoBurnEnabled) {
      return autoBurn(c, message, 'Access attempt from outside the allowed country', country);
    }
    return c.json({
      error: country
        ? 'This message can only be opened from the sender\'s country.'
        : 'This message is restricted by country, and your country could not be determined.',
      code: 'GEO_RESTRICTED'
    }, 403);
  }
  return null;
}

/**
 * Record a failed password/2FA guess and, if auto-burn is on, check whether the pattern is suspicious
 * (failures from two or more countries within 10 minutes). Returns a Response when it burned, else null.
 */
export async function recordFailure(c, message, kind) {
  const { country } = readCountry(c);
  await logEvent(c, message, kind === 'totp' ? 'failed_totp' : 'failed_password', country);
  if (message.auto_burn_suspicious !== 1) return null;

  const { n } = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT COALESCE(country, '??')) AS n
     FROM audit_logs
     WHERE message_id = ? AND event_type IN ('failed_password', 'failed_totp')
       AND timestamp > datetime('now', '${SUSPICION_WINDOW}')`
  ).bind(message.token).first();

  if (n >= 2) {
    return autoBurn(c, message, 'Wrong password or 2FA code attempts from multiple countries', country);
  }
  return null;
}

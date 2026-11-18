import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { incrementStat } from '../utils/stats.js';
import { bumpTeamStat } from '../utils/teamStats.js';
import { validateSlug, sanitizeSlug, isSlugAvailable } from '../utils/slugValidation.js';
import { getMessageByIdentifier, deleteMessageByIdentifier, deleteExpiredMessage } from '../utils/messageHelpers.js';
import { createGroupMessage, incrementGroupAccess } from '../utils/groupMessages.js';
import { sha256hex } from '../utils/password.js';
import { readCountry } from '../utils/geo.js';
import { hashCreatorToken, matchesCreatorToken } from '../utils/creatorToken.js';
import { sealSecret, openSecret } from '../utils/secretBox.js';
import { denyIfRestricted, recordFailure, geoVerdict } from '../utils/protections.js';
import { clampInt, limitOrUnlimited, flag, MAX_EXPIRY_SECONDS } from '../utils/messageOptions.js';
import crypto from 'node:crypto';
import { generateTOTPSecret, generateTOTPUri, verifyTOTP, createTotpProof, verifyTotpProof } from '../utils/totp.js';

const app = new Hono();

// ---- helpers -------------------------------------------------------------

function safeEqualStr(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Enforce the password-derived auth tag server-side.
 * Wrong tags count against max_password_attempts (atomic D1 increment); the message is
 * destroyed once the limit is reached. Returns a Response to send, or null if OK.
 * Messages without auth_hash (legacy / group) are not checked.
 */
async function enforceAuthTag(c, message) {
  if (!message.auth_hash) return null;
  const tag = c.req.header('X-Auth-Tag');
  // No tag at all is "not authenticated" (401), not a password guess: it must not burn the message
  if (!tag) {
    return c.json({ error: 'Password proof required', code: 'AUTH_TAG_REQUIRED' }, 401);
  }
  if (safeEqualStr(await sha256hex(tag), message.auth_hash)) return null;

  const row = await c.env.DB.prepare(
    `UPDATE messages SET password_attempts = password_attempts + 1
     WHERE token = ? AND accessed = 0
     RETURNING password_attempts, max_password_attempts`
  ).bind(message.token).first();
  if (!row) {
    // Burned (or consumed) by a concurrent request between our lookup and this update
    return c.json({ error: 'Message not found or already accessed' }, 404);
  }
  const configured = row?.max_password_attempts;
  const unlimited = configured < 0;
  const max = configured || 3;
  if (!unlimited && row.password_attempts > max) {
    // Another request already crossed the limit and burned it: don't burn (or count) it twice
    return c.json({ error: 'Message not found or already accessed' }, 404);
  }
  if (!unlimited && row.password_attempts === max) {
    await deleteExpiredMessage(c.env.DB, c.env.MEDIA_BUCKET, message.token, message);
    await incrementStat(c.env.DB, 'messages_burned');
    await bumpTeamStat(c.env.DB, message.team_id, 'messages_burned');
    return c.json({ error: 'Too many incorrect attempts. The message has been destroyed.', code: 'BURNED_ATTEMPTS' }, 410);
  }
  const suspicious = await recordFailure(c, message, 'password');
  if (suspicious) return suspicious;
  return c.json({
    error: unlimited
      ? 'Incorrect password.'
      : `Incorrect password. ${Math.max(0, max - (row?.password_attempts || 0))} attempt(s) remaining.`,
    code: 'BAD_AUTH_TAG'
  }, 401);
}

// Check if custom slug is available
app.get('/check-slug/:slug', rateLimitMiddleware(30, 60), async (c) => {
  try {
    const slug = c.req.param('slug');
    
    // Sanitize and validate
    const sanitized = sanitizeSlug(slug);
    const validation = validateSlug(sanitized);
    
    if (!validation.valid) {
      return c.json({ 
        available: false, 
        error: validation.error 
      });
    }
    
    // Check availability
    const available = await isSlugAvailable(c.env.DB, sanitized);
    
    return c.json({
      available,
      slug: sanitized,
      error: available ? null : 'This custom URL is already taken'
    });
  } catch (error) {
    console.error('Error checking slug:', error);
    return c.json({ error: 'Failed to check slug availability' }, 500);
  }
});

// Create encrypted message
app.post('/', rateLimitMiddleware(10, 60), async (c) => {
  try {
    const body = await c.req.json();
    const { 
      encryptedData, 
      iv, 
      salt, 
      expiresIn, 
      customSlug,
      authTag
    } = body;
    const maxViews = limitOrUnlimited(body.maxViews, 1);
    const maxPasswordAttempts = limitOrUnlimited(body.maxPasswordAttempts, 3);
    const requireGeoMatch = flag(body.requireGeoMatch);
    const autoBurnOnSuspicious = flag(body.autoBurnOnSuspicious);
    const require2FA = flag(body.require2FA);

    if (typeof encryptedData !== 'string' || typeof iv !== 'string' || typeof salt !== 'string' || !encryptedData || !iv || !salt) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    if (authTag !== undefined && (typeof authTag !== 'string' || authTag.length < 32 || authTag.length > 128)) {
      return c.json({ error: 'Invalid auth tag' }, 400);
    }
    if (expiresIn !== undefined && expiresIn !== null &&
        (!Number.isFinite(Number(expiresIn)) || Number(expiresIn) <= 0 || Number(expiresIn) > MAX_EXPIRY_SECONDS)) {
      return c.json({ error: 'expiresIn must be between 1 second and 30 days' }, 400);
    }

    // Validate field sizes
    // iv and salt must each be exactly 16 bytes = 24 base64 chars (or 16 raw chars)
    if (iv.length !== 16 && iv.length !== 24) {
      return c.json({ error: 'Invalid iv length' }, 400);
    }
    if (salt.length !== 16 && salt.length !== 24) {
      return c.json({ error: 'Invalid salt length' }, 400);
    }
    // encryptedData max 2MB base64
    if (encryptedData.length > 1.4 * 1024 * 1024) { // keep under D1's 2 MB row limit
      return c.json({ error: 'Message too large' }, 413);
    }

    // Generate unique token and creator token
    const token = nanoid(32);
    const creatorToken = nanoid(32);
    const createdAt = Date.now();
    // expiresIn is in seconds, convert to milliseconds
    const expiresAt = expiresIn ? createdAt + (Number(expiresIn) * 1000) : null;
    const authHash = authTag ? await sha256hex(authTag) : null;

    // Get creator's country from CF headers (for geo-matching)
    const { country: creatorCountry } = readCountry(c);
    if (requireGeoMatch && !creatorCountry) {
      return c.json({
        error: 'Your country could not be determined, so a country restriction cannot be applied. Turn it off or try again without a VPN/Tor.',
        code: 'GEO_UNAVAILABLE'
      }, 400);
    }

    // Generate TOTP secret if 2FA is required
    let totpSecret = null;
    let totpUri = null;
    if (require2FA) {
      totpSecret = generateTOTPSecret();
      // Create label with short message ID for identification
      const messageLabel = `Message:${token.substring(0, 8)}`;
      totpUri = generateTOTPUri(totpSecret, messageLabel, 'NoteBurner');
    }

    // Handle custom slug if provided
    let finalSlug = null;
    if (customSlug?.trim()) {
      // Sanitize the slug
      const sanitized = sanitizeSlug(customSlug);
      
      // Validate the slug
      const validation = validateSlug(sanitized);
      if (!validation.valid) {
        return c.json({ error: validation.error }, 400);
      }
      
      // Check if slug is available
      const available = await isSlugAvailable(c.env.DB, sanitized);
      if (!available) {
        return c.json({ error: 'This custom URL is already taken' }, 409);
      }
      
      finalSlug = sanitized;
    }

    // Store in D1 with security options. Two requests can pass the slug-availability check at the same
    // time; the UNIQUE index decides, so answer 409 (not 500) to the loser.
    try {
      await c.env.DB.prepare(
        `INSERT INTO messages (
          token, encrypted_data, iv, salt, created_at, expires_at, accessed, custom_slug,
          creator_token, max_views, view_count, max_password_attempts, password_attempts,
          require_geo_match, creator_country, auto_burn_suspicious, require_2fa, totp_secret, auth_hash
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?, ?)`
      ).bind(
        token, encryptedData, iv, salt, createdAt, expiresAt, finalSlug,
        await hashCreatorToken(creatorToken), maxViews, maxPasswordAttempts, requireGeoMatch, 
        creatorCountry, autoBurnOnSuspicious, require2FA, await sealSecret(c.env, totpSecret, token), authHash
      ).run();
    } catch (err) {
      if (/UNIQUE/i.test(String(err?.message))) {
        return c.json({ error: 'This custom URL is already taken' }, 409);
      }
      throw err;
    }

    // Log creation event
    await c.env.DB.prepare(
      `INSERT INTO audit_logs (message_id, event_type, country, success, metadata)
       VALUES (?, 'created', ?, 1, ?)`
    ).bind(
      token, 
      creatorCountry,
      JSON.stringify({ maxViews, maxPasswordAttempts, requireGeoMatch, autoBurnOnSuspicious })
    ).run();

    // Increment stats
    await incrementStat(c.env.DB, 'messages_created');

    // Use FRONTEND_URL from environment or fallback to request origin
    const frontendUrl = c.env.FRONTEND_URL || new URL(c.req.url).origin;

    // Both custom slugs and tokens use /m/ prefix
    const urlPath = `/m/${finalSlug || token}`;

    const response = {
      success: true,
      token,
      creatorToken,
      slug: finalSlug,
      url: `${frontendUrl}${urlPath}`
    };

    // Include TOTP info if 2FA is enabled — QR code generated client-side from the URI
    if (require2FA && totpUri) {
      response.totp = {
        secret: totpSecret,
        uri: totpUri
      };
    }

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating message:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
});

// Create group message (1-to-many)
app.post('/group', rateLimitMiddleware(5, 60), async (c) => {
  try {
    const body = await c.req.json();
    const { 
      encryptedData, 
      iv, 
      salt, 
      expiresIn, 
      recipientCount = 1,
      maxViews = null,
      burnOnFirstView = false
    } = body;

    if (!encryptedData || !iv || !salt) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (recipientCount < 1 || recipientCount > 100) {
      return c.json({ error: 'Recipient count must be between 1 and 100' }, 400);
    }

    // Create group message with multiple links
    const groupData = await createGroupMessage(
      c.env.DB,
      { encryptedData, iv, salt, expiresIn },
      { recipientCount, maxViews, burnOnFirstView }
    );

    // Increment stats for group message creation
    await incrementStat(c.env.DB, 'messages_created');

    // Use FRONTEND_URL from environment or fallback to request origin
    const frontendUrl = c.env.FRONTEND_URL || new URL(c.req.url).origin;

    // Generate URLs for all recipient links
    const recipientUrls = groupData.links.map(link => ({
      recipientIndex: link.recipientIndex,
      token: link.token,
      url: `${frontendUrl}/m/${link.token}`
    }));

    return c.json({
      success: true,
      groupId: groupData.groupId,
      recipientCount: groupData.recipientCount,
      links: recipientUrls,
      expiresAt: groupData.expiresAt,
      burnOnFirstView: groupData.burnOnFirstView,
      maxViews: groupData.maxViews
    }, 201);
  } catch (error) {
    console.error('Error creating group message:', error);
    return c.json({ error: 'Failed to create group message' }, 500);
  }
});

// Public metadata needed to start decryption (no ciphertext): salt for key derivation,
// expiry, and which protections apply. Never reveals secrets or the auth hash.
app.get('/:identifier/meta', async (c) => {
  try {
    const identifier = c.req.param('identifier');
    const result = await getMessageByIdentifier(c.env.DB, identifier, { includeSecrets: true });
    if (!result) {
      return c.json({ error: 'Message not found or already accessed' }, 404);
    }
    if (result.expires_at && Date.now() > result.expires_at) {
      await deleteExpiredMessage(c.env.DB, c.env.MEDIA_BUCKET, identifier, result);
      return c.json({ error: 'Message has expired' }, 410);
    }
    return c.json({
      salt: result.salt,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
      totpRequired: result.require_2fa === 1,
      authRequired: !!result.auth_hash,
      geoRestricted: result.require_geo_match === 1,
      geoAllowed: geoVerdict(c, result).allowed,
      autoBurn: result.auto_burn_suspicious === 1
    });
  } catch (error) {
    console.error('Error retrieving message metadata:', error);
    return c.json({ error: 'Failed to retrieve message' }, 500);
  }
});

// Get and delete message (one-time access) - supports both token and custom slug
app.get('/:identifier', async (c) => {
  try {
    const identifier = c.req.param('identifier');

    if (!identifier) {
      return c.json({ error: 'Invalid identifier' }, 400);
    }

    // Retrieve message without marking as accessed yet
    const result = await getMessageByIdentifier(c.env.DB, identifier, { includeSecrets: true });

    if (!result) {
      // Message either doesn't exist or was already accessed
      return c.json({ error: 'Message not found or already accessed' }, 404);
    }

    // Check expiration
    if (result.expires_at && Date.now() > result.expires_at) {
      // Delete expired message and media files
      await deleteExpiredMessage(c.env.DB, c.env.MEDIA_BUCKET, identifier, result);
      return c.json({ error: 'Message has expired' }, 410);
    }

    // Country restriction / suspicious-access protection (before anything is released)
    const restricted = await denyIfRestricted(c, result);
    if (restricted) return restricted;

    // 2FA-protected: only reveal ciphertext to callers holding a valid TOTP proof
    if (result.require_2fa === 1) {
      const proof = c.req.header('X-TOTP-Proof');
      if (!verifyTotpProof(proof, await openSecret(c.env, result.totp_secret, result.token), identifier)) {
        return c.json({
          totpRequired: true,
          expiresAt: result.expires_at,
          createdAt: result.created_at
        });
      }
    }

    // Password proof (server-enforced): wrong tags count toward max_password_attempts
    const authFailure = await enforceAuthTag(c, result);
    if (authFailure) return authFailure;

    // Atomically claim a view. Once max_views is used up the ciphertext is never released
    // again, so link scanners/unfurlers cannot silently re-fetch it.
    const claimed = await c.env.DB.prepare(
      `UPDATE messages SET view_count = view_count + 1
       WHERE token = ? AND accessed = 0
         AND (max_views < 0 OR view_count < COALESCE(NULLIF(max_views, 0), 1))
       RETURNING token, view_count, max_views`
    ).bind(result.token).first();
    if (!claimed) {
      await deleteExpiredMessage(c.env.DB, c.env.MEDIA_BUCKET, identifier, result);
      return c.json({ error: 'This message has already been viewed and is destroyed.', code: 'ALREADY_VIEWED' }, 410);
    }

    await bumpTeamStat(c.env.DB, result.team_id, 'messages_viewed');

    // How many views remain after this one (null = unlimited). The client burns only when 0.
    const viewsRemaining = claimed.max_views < 0
      ? null
      : Math.max(0, (claimed.max_views || 1) - claimed.view_count);

    // Return message data for decryption attempt
    const response = {
      viewsRemaining,
      encryptedData: result.encrypted_data,
      iv: result.iv,
      salt: result.salt,
      mediaFiles: result.media_files ? JSON.parse(result.media_files) : [],
      createdAt: result.created_at,
      expiresAt: result.expires_at,
      totpRequired: result.require_2fa === 1
    };

    return c.json(response);
  } catch (error) {
    console.error('Error retrieving message:', error);
    return c.json({ error: 'Failed to retrieve message' }, 500);
  }
});

// Verify TOTP code for 2FA-protected messages
app.post('/:identifier/verify-totp', async (c) => {
  try {
    const identifier = c.req.param('identifier');
    const { code } = await c.req.json();

    if (!identifier || !code) {
      return c.json({ error: 'Identifier and code are required' }, 400);
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return c.json({ error: 'Invalid code format. Must be 6 digits.' }, 400);
    }

    // Retrieve message
    const result = await getMessageByIdentifier(c.env.DB, identifier, { includeSecrets: true });

    if (!result) {
      return c.json({ error: 'Message not found' }, 404);
    }

    // Check if 2FA is required
    if (!result.require_2fa || !result.totp_secret) {
      return c.json({ error: 'This message does not require 2FA' }, 400);
    }

    // Atomic per-message cap across ALL IPs: burn the message after 10 total guesses
    const counted = await c.env.DB.prepare(
      `UPDATE messages SET totp_attempts = totp_attempts + 1
       WHERE token = ? AND accessed = 0 RETURNING totp_attempts`
    ).bind(result.token).first();
    if (counted && counted.totp_attempts > 10) {
      await deleteExpiredMessage(c.env.DB, c.env.MEDIA_BUCKET, identifier, result);
      return c.json({ error: 'Too many 2FA attempts. The message has been destroyed.', code: 'BURNED_2FA' }, 410);
    }

    // Per-IP brute-force protection: max 5 attempts per 5 minutes
    const kv = c.env.CACHE;
    const clientIp = c.req.header('CF-Connecting-IP') || 'unknown';
    const attemptsKey = `totp_attempts:${identifier}:${clientIp}`;
    if (kv) {
      const attempts = await kv.get(attemptsKey);
      const count = attempts ? parseInt(attempts, 10) : 0;
      if (count >= 5) {
        return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
      }
    }

    // Verify TOTP code
    const restricted = await denyIfRestricted(c, result);
    if (restricted) return restricted;

    const totpSecret = await openSecret(c.env, result.totp_secret, result.token);
    const isValid = verifyTOTP(code, totpSecret, 1); // Allow 1 window drift (±30s)

    if (!isValid) {
      const suspicious = await recordFailure(c, result, 'totp');
      if (suspicious) return suspicious;
      // Increment attempt counter on failure
      if (kv) {
        const attempts = await kv.get(attemptsKey);
        const count = attempts ? parseInt(attempts, 10) : 0;
        await kv.put(attemptsKey, String(count + 1), { expirationTtl: 300 });
      }
      return c.json({ error: 'Invalid or expired code. Please try again.' }, 401);
    }

    // TOTP verified — clear attempt counter
    if (kv) {
      await kv.delete(attemptsKey);
    }

    return c.json({
      success: true,
      message: 'TOTP verified successfully',
      proof: createTotpProof(totpSecret, identifier)
    });
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return c.json({ error: 'Failed to verify TOTP code' }, 500);
  }
});

// Delete message after successful decryption (called by frontend)
// Optionally accepts X-Creator-Token for creator-initiated early burns.
// Recipient burns after decryption must present the password-derived X-Auth-Tag (and TOTP proof if 2FA).
app.delete('/:identifier', async (c) => {
  try {
    const identifier = c.req.param('identifier');

    if (!identifier) {
      return c.json({ error: 'Invalid identifier' }, 400);
    }

    // If a creator token is provided, verify it before allowing deletion.
    // This supports creator-initiated early burns. If not provided, allow
    // the normal self-destruct flow (recipient burns after decryption).
    const creatorToken = c.req.header('X-Creator-Token');
    let isCreator = false;
    if (creatorToken) {
      const message = await c.env.DB.prepare(
        `SELECT creator_token FROM messages WHERE token = ? OR custom_slug = ?`
      ).bind(identifier, identifier).first();

      if (!message) {
        return c.json({ error: 'Message not found or already deleted' }, 404);
      }

      if (!(await matchesCreatorToken(message.creator_token, creatorToken)).ok) {
        return c.json({ error: 'Invalid creator token', code: 'INVALID_CREATOR_TOKEN' }, 403);
      }
      isCreator = true;
    }

    // 2FA-protected messages can only be burned by the creator or with a valid TOTP proof
    if (!isCreator) {
      const protectedMsg = await getMessageByIdentifier(c.env.DB, identifier, { includeSecrets: true });
      if (protectedMsg) {
        const restricted = await denyIfRestricted(c, protectedMsg);
        if (restricted) return restricted;
      }
      if (protectedMsg?.require_2fa === 1 &&
          !verifyTotpProof(c.req.header('X-TOTP-Proof'), await openSecret(c.env, protectedMsg.totp_secret, protectedMsg.token), identifier)) {
        return c.json({ error: 'TOTP verification required', code: 'TOTP_REQUIRED' }, 403);
      }
      // Burning without being the creator requires proof of the password (auth tag),
      // so holders of only the link cannot destroy the message.
      if (protectedMsg) {
        const authFailure = await enforceAuthTag(c, protectedMsg);
        if (authFailure) return authFailure;
      }
    }

    // Atomically mark as accessed and get message to prevent race condition
    const result = await deleteMessageByIdentifier(c.env.DB, identifier);

    if (!result) {
      // Message either doesn't exist or was already deleted
      return c.json({ error: 'Message not found or already deleted' }, 404);
    }

    // Check if this is a group message
    if (result.group_id) {
      // Increment group access count and check if all should burn
      const shouldBurnAll = await incrementGroupAccess(c.env.DB, result.group_id);
      
      if (shouldBurnAll) {
        // All messages in the group were already deleted by incrementGroupAccess
        console.log('Group message burned:', { groupId: result.group_id, burnOnFirstView: true });
        
        // Increment stats for all burned messages
        await incrementStat(c.env.DB, 'messages_burned');
        
        return c.json({ 
          success: true, 
          groupBurned: true,
          groupId: result.group_id
        });
      }
    }

    // Delete individual message from database using token
    await c.env.DB.prepare(`DELETE FROM messages WHERE token = ?`).bind(result.token).run();

    // Increment stats
    await incrementStat(c.env.DB, 'messages_burned');
    await bumpTeamStat(c.env.DB, result.team_id, 'messages_burned');

    // DON'T delete media files immediately - allow grace period for large file downloads
    // Track files in D1 for cleanup after 24 hours (avoids re-uploading large files to R2)
    let markedMediaCount = 0;
    if (result.media_files) {
      const mediaFiles = JSON.parse(result.media_files);
      const deleteAfter = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
      const markedAt = Date.now();

      for (const fileId of mediaFiles) {
        try {
          // Insert into media_cleanup table (lightweight D1 operation)
          await c.env.DB.prepare(
            `INSERT OR IGNORE INTO media_cleanup (file_id, delete_after, marked_at) VALUES (?, ?, ?)`
          ).bind(fileId, deleteAfter, markedAt).run();
          markedMediaCount++;
        } catch (err) {
          console.error('Failed to mark media file:', { fileId, error: err });
        }
      }
    }

    console.log('Message deleted:', { token: result.token, identifier, markedMediaCount, messageAge: '24 hours' });
    return c.json({ success: true, markedMedia: markedMediaCount });
  } catch (error) {
    console.error('Error deleting message:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
});

export default app;

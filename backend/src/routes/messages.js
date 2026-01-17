import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { incrementStat } from '../utils/stats.js';
import { validateSlug, sanitizeSlug, isSlugAvailable } from '../utils/slugValidation.js';
import { getMessageByIdentifier, deleteMessageByIdentifier, deleteExpiredMessage } from '../utils/messageHelpers.js';
import { createGroupMessage, incrementGroupAccess } from '../utils/groupMessages.js';

const app = new Hono();

// Check if custom slug is available
app.get('/check-slug/:slug', async (c) => {
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
app.post('/', rateLimitMiddleware(10, 60000), async (c) => {
  try {
    const body = await c.req.json();
    const { encryptedData, iv, salt, expiresIn, customSlug } = body;

    if (!encryptedData || !iv || !salt) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate unique token
    const token = nanoid(32);
    const createdAt = Date.now();
    // expiresIn is in seconds, convert to milliseconds
    const expiresAt = expiresIn ? createdAt + (expiresIn * 1000) : null;

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

    // Store in D1
    await c.env.DB.prepare(
      `INSERT INTO messages (token, encrypted_data, iv, salt, created_at, expires_at, accessed, custom_slug) 
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(token, encryptedData, iv, salt, createdAt, expiresAt, finalSlug).run();

    // Increment stats
    await incrementStat(c.env.DB, 'messages_created');

    // Use FRONTEND_URL from environment or fallback to request origin
    const frontendUrl = c.env.FRONTEND_URL || new URL(c.req.url).origin;

    // Both custom slugs and tokens use /m/ prefix
    const urlPath = `/m/${finalSlug || token}`;

    return c.json({
      success: true,
      token,
      slug: finalSlug,
      url: `${frontendUrl}${urlPath}`
    }, 201);
  } catch (error) {
    console.error('Error creating message:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
});

// Create group message (1-to-many)
app.post('/group', rateLimitMiddleware(5, 60000), async (c) => {
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
    return c.json({ error: error.message || 'Failed to create group message' }, 500);
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
    const result = await getMessageByIdentifier(c.env.DB, identifier);

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

    // Increment incorrect attempts (will be reset on successful decryption)
    await c.env.DB.prepare(
      `UPDATE messages SET incorrect_attempts = incorrect_attempts + 1 WHERE token = ?`
    ).bind(result.token).run();

    // Return message data for decryption attempt
    const response = {
      encryptedData: result.encrypted_data,
      iv: result.iv,
      salt: result.salt,
      mediaFiles: result.media_files ? JSON.parse(result.media_files) : [],
      createdAt: result.created_at,
      expiresAt: result.expires_at
    };

    return c.json(response);
  } catch (error) {
    console.error('Error retrieving message:', error);
    return c.json({ error: 'Failed to retrieve message' }, 500);
  }
});

// Delete message after successful decryption (called by frontend)
app.delete('/:identifier', async (c) => {
  try {
    const identifier = c.req.param('identifier');

    if (!identifier) {
      return c.json({ error: 'Invalid identifier' }, 400);
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

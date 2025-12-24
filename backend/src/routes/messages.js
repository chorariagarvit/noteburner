import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { incrementStat } from '../utils/stats.js';

const app = new Hono();

// Create encrypted message
app.post('/', rateLimitMiddleware(10, 60000), async (c) => {
  try {
    const body = await c.req.json();
    const { encryptedData, iv, salt, expiresIn } = body;

    if (!encryptedData || !iv || !salt) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate unique token
    const token = nanoid(32);
    const createdAt = Date.now();
    const expiresAt = expiresIn ? createdAt + (expiresIn * 1000) : null;

    // Store in D1
    await c.env.DB.prepare(
      `INSERT INTO messages (token, encrypted_data, iv, salt, created_at, expires_at, accessed) 
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    ).bind(token, encryptedData, iv, salt, createdAt, expiresAt).run();

    // Increment stats
    await incrementStat(c.env.DB, 'messages_created');

    // Use FRONTEND_URL from environment or fallback to request origin
    const frontendUrl = c.env.FRONTEND_URL || new URL(c.req.url).origin;

    return c.json({
      success: true,
      token,
      url: `${frontendUrl}/m/${token}`
    }, 201);
  } catch (error) {
    console.error('Error creating message:', error);
    return c.json({ error: 'Failed to create message' }, 500);
  }
});

// Get and delete message (one-time access)
app.get('/:token', async (c) => {
  try {
    const token = c.req.param('token');

    if (!token || token?.length !== 32) {
      return c.json({ error: 'Invalid token' }, 400);
    }

    // Retrieve message without marking as accessed yet
    // Allow multiple attempts for wrong password
    const result = await c.env.DB.prepare(
      `SELECT * FROM messages WHERE token = ? AND accessed = 0`
    ).bind(token).first();

    if (!result) {
      // Message either doesn't exist or was already accessed
      return c.json({ error: 'Message not found or already accessed' }, 404);
    }

    // Check expiration
    if (result.expires_at && Date.now() > result.expires_at) {
      // Delete expired message
      await c.env.DB.prepare(`DELETE FROM messages WHERE token = ?`).bind(token).run();

      // Delete associated media files
      if (result.media_files) {
        const mediaFiles = JSON.parse(result.media_files);
        for (const fileId of mediaFiles) {
          await c.env.MEDIA_BUCKET.delete(fileId);
        }
      }

      return c.json({ error: 'Message has expired' }, 410);
    }

    // Increment incorrect attempts (will be reset on successful decryption)
    await c.env.DB.prepare(
      `UPDATE messages SET incorrect_attempts = incorrect_attempts + 1 WHERE token = ?`
    ).bind(token).run();

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
app.delete('/:token', async (c) => {
  try {
    const token = c.req.param('token');

    if (!token || token?.length !== 32) {
      return c.json({ error: 'Invalid token' }, 400);
    }

    // Atomically mark as accessed and get message to prevent race condition
    // Only first successful decryption should reach here
    const result = await c.env.DB.prepare(
      `UPDATE messages SET accessed = 1 WHERE token = ? AND accessed = 0 RETURNING media_files`
    ).bind(token).first();

    if (!result) {
      // Message either doesn't exist or was already deleted
      return c.json({ error: 'Message not found or already deleted' }, 404);
    }

    // Delete message from database
    await c.env.DB.prepare(`DELETE FROM messages WHERE token = ?`).bind(token).run();

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

    console.log('Message deleted:', { token, markedMediaCount, messageAge: '24 hours' });
    return c.json({ success: true, markedMedia: markedMediaCount });
  } catch (error) {
    console.error('Error deleting message:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
});

export default app;

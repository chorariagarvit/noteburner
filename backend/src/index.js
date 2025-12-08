import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { nanoid } from 'nanoid';

const app = new Hono();

// CORS middleware
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Rate limiting helper
const rateLimitMap = new Map();

function checkRateLimit(ip, limit = 10, window = 60000) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < window);
  
  if (recentRequests.length >= limit) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'NoteBurner API',
    version: '1.0.0'
  });
});

// Create encrypted message
app.post('/api/messages', async (c) => {
  try {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    
    if (!checkRateLimit(ip, 10, 60000)) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

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
app.get('/api/messages/:token', async (c) => {
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
      createdAt: result.created_at
    };

    return c.json(response);
  } catch (error) {
    console.error('Error retrieving message:', error);
    return c.json({ error: 'Failed to retrieve message' }, 500);
  }
});

// Delete message after successful decryption (called by frontend)
app.delete('/api/messages/:token', async (c) => {
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
          console.error(`Failed to mark media file ${fileId}:`, err);
        }
      }
    }

    console.log(`Message ${token} deleted, ${markedMediaCount} media files marked for deletion in 24 hours`);
    return c.json({ success: true, markedMedia: markedMediaCount });
  } catch (error) {
    console.error('Error deleting message:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
});

// Upload encrypted media file
app.post('/api/media', async (c) => {
  try {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    
    if (!checkRateLimit(ip, 5, 60000)) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    const body = await c.req.json();
    const { fileData, fileName, fileType, iv, salt, token } = body;

    if (!fileData || !fileName || !iv || !salt || !token) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify token exists
    const message = await c.env.DB.prepare(
      `SELECT media_files FROM messages WHERE token = ?`
    ).bind(token).first();

    if (!message) {
      return c.json({ error: 'Invalid message token' }, 404);
    }

    // Generate unique file ID
    const fileId = nanoid(32);
    
    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(fileData), c => c.codePointAt(0));

    // Store in R2 with encryption metadata
    await c.env.MEDIA_BUCKET.put(fileId, binaryData, {
      httpMetadata: {
        contentType: fileType || 'application/octet-stream',
      },
      customMetadata: {
        originalName: fileName,
        messageToken: token,
        iv: iv,
        salt: salt
      }
    });

    // Update message with file reference
    const existingFiles = message.media_files ? JSON.parse(message.media_files) : [];
    existingFiles.push(fileId);
    
    await c.env.DB.prepare(
      `UPDATE messages SET media_files = ? WHERE token = ?`
    ).bind(JSON.stringify(existingFiles), token).run();

    return c.json({ 
      success: true,
      fileId,
      fileName 
    }, 201);
  } catch (error) {
    console.error('Error uploading media:', error);
    return c.json({ error: 'Failed to upload media' }, 500);
  }
});

// Get encrypted media file
app.get('/api/media/:fileId', async (c) => {
  try {
    const fileId = c.req.param('fileId');
    
    if (!fileId || fileId?.length !== 32) {
      return c.json({ error: 'Invalid file ID' }, 400);
    }

    // Retrieve from R2
    const object = await c.env.MEDIA_BUCKET.get(fileId);

    if (!object) {
      return c.json({ error: 'File not found or already downloaded' }, 404);
    }

    // Return file data
    const arrayBuffer = await object.arrayBuffer();
    const base64Data = btoa(String.fromCodePoint(...new Uint8Array(arrayBuffer)));

    return c.json({
      fileData: base64Data,
      fileName: object.customMetadata?.originalName || 'unknown',
      fileType: object.httpMetadata?.contentType || 'application/octet-stream',
      iv: object.customMetadata?.iv || '',
      salt: object.customMetadata?.salt || ''
    });
  } catch (error) {
    console.error('Error retrieving media:', error);
    return c.json({ error: 'Failed to retrieve media' }, 500);
  }
});

// Confirm media download and delete (one-time download)
app.delete('/api/media/:fileId', async (c) => {
  try {
    const fileId = c.req.param('fileId');
    
    if (!fileId || fileId?.length !== 32) {
      return c.json({ error: 'Invalid file ID' }, 400);
    }

    // Delete from R2 after successful download
    await c.env.MEDIA_BUCKET.delete(fileId);
    
    // Also remove from cleanup tracking if it exists
    await c.env.DB.prepare(
      `DELETE FROM media_cleanup WHERE file_id = ?`
    ).bind(fileId).run();

    console.log(`Media file ${fileId} deleted after successful download`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error confirming media download:', error);
    return c.json({ error: 'Failed to confirm download' }, 500);
  }
});

// Cleanup expired messages (scheduled job)
app.get('/api/cleanup', async (c) => {
  try {
    const now = Date.now();
    
    // Find expired messages
    const expiredMessages = await c.env.DB.prepare(
      `SELECT token, media_files FROM messages WHERE expires_at IS NOT NULL AND expires_at < ?`
    ).bind(now).all();

    // Delete expired messages and their media
    for (const message of expiredMessages.results) {
      // Delete media files
      if (message.media_files) {
        const mediaFiles = JSON.parse(message.media_files);
        for (const fileId of mediaFiles) {
          await c.env.MEDIA_BUCKET.delete(fileId);
        }
      }
      
      // Delete message
      await c.env.DB.prepare(`DELETE FROM messages WHERE token = ?`).bind(message.token).run();
    }

    return c.json({ 
      success: true,
      deletedCount: expiredMessages.results.length 
    });
  } catch (error) {
    console.error('Error cleaning up:', error);
    return c.json({ error: 'Cleanup failed' }, 500);
  }
});

// Export worker with both fetch and scheduled handlers
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
  
  async scheduled(event, env, ctx) {
    // Run cleanup job automatically
    console.log('Running scheduled cleanup job...');
    try {
      const now = Date.now();
      
      // 1. Find expired messages
      const messagesToDelete = await env.DB.prepare(
        `SELECT token, media_files FROM messages 
         WHERE expires_at IS NOT NULL AND expires_at < ?`
      ).bind(now).all();

      // Delete expired messages and their media
      for (const message of messagesToDelete.results) {
        // Delete media files
        if (message.media_files) {
          const mediaFiles = JSON.parse(message.media_files);
          for (const fileId of mediaFiles) {
            await env.MEDIA_BUCKET.delete(fileId);
          }
        }
        
        // Delete message
        await env.DB.prepare(`DELETE FROM messages WHERE token = ?`).bind(message.token).run();
      }
      
      // 2. Find and delete media files marked for deletion (from D1 tracking table)
      const mediaToDelete = await env.DB.prepare(
        `SELECT file_id FROM media_cleanup WHERE delete_after < ?`
      ).bind(now).all();
      
      let markedMediaDeleted = 0;
      for (const row of mediaToDelete.results) {
        try {
          await env.MEDIA_BUCKET.delete(row.file_id);
          await env.DB.prepare(`DELETE FROM media_cleanup WHERE file_id = ?`).bind(row.file_id).run();
          markedMediaDeleted++;
          console.log(`Deleted marked media file: ${row.file_id}`);
        } catch (err) {
          console.error(`Failed to delete media file ${row.file_id}:`, err);
        }
      }
      
      console.log(`Cleanup completed: ${messagesToDelete.results.length} messages deleted, ${markedMediaDeleted} marked media files deleted`);
    } catch (error) {
      console.error('Scheduled cleanup error:', error);
    }
  }
};

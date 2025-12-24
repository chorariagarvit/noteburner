import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';
import { incrementStat } from '../utils/stats.js';

const app = new Hono();

// Initialize multipart upload for large files (>100MB)
app.post('/init', rateLimitMiddleware(5, 60000), async (c) => {
  try {
    const body = await c.req.json();
    const { fileName, fileType, fileSize, iv, salt, token } = body;

    if (!fileName || !iv || !salt || !token || !fileSize) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check file size limit (2GB)
    if (fileSize > 2 * 1024 * 1024 * 1024) {
      return c.json({ error: 'File size exceeds 2GB limit' }, 400);
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
    const uploadId = nanoid(32);

    // Create multipart upload in R2
    const multipartUpload = await c.env.MEDIA_BUCKET.createMultipartUpload(fileId, {
      httpMetadata: {
        contentType: fileType || 'application/octet-stream',
      },
      customMetadata: {
        originalName: fileName,
        messageToken: token,
        iv: iv,
        salt: salt,
        uploadId: uploadId
      }
    });

    return c.json({
      success: true,
      fileId,
      uploadId: multipartUpload.uploadId,
      chunkSize: 50 * 1024 * 1024 // 50MB chunks
    }, 201);
  } catch (error) {
    console.error('Error initializing upload:', error);
    return c.json({ error: 'Failed to initialize upload' }, 500);
  }
});

// Upload a single chunk
app.post('/chunk', rateLimitMiddleware(50, 60000), async (c) => {
  try {
    const body = await c.req.json();
    const { fileId, uploadId, chunkIndex, chunkData } = body;

    if (!fileId || !uploadId || chunkIndex === undefined || !chunkData) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Convert base64 to binary
    const binaryString = atob(chunkData);
    const binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }

    // Upload chunk as part
    const multipartUpload = c.env.MEDIA_BUCKET.resumeMultipartUpload(fileId, uploadId);
    const part = await multipartUpload.uploadPart(chunkIndex + 1, binaryData);

    return c.json({
      success: true,
      partNumber: chunkIndex + 1,
      etag: part.etag
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return c.json({ error: 'Failed to upload chunk' }, 500);
  }
});

// Complete multipart upload
app.post('/complete', async (c) => {
  try {
    const body = await c.req.json();
    const { fileId, uploadId, parts, fileName, token, fileSize } = body;

    if (!fileId || !uploadId || !parts || !token) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Complete the multipart upload
    const multipartUpload = c.env.MEDIA_BUCKET.resumeMultipartUpload(fileId, uploadId);
    await multipartUpload.complete(parts);

    // Update message with file reference
    const message = await c.env.DB.prepare(
      `SELECT media_files FROM messages WHERE token = ?`
    ).bind(token).first();

    const existingFiles = message.media_files ? JSON.parse(message.media_files) : [];
    existingFiles.push(fileId);

    await c.env.DB.prepare(
      `UPDATE messages SET media_files = ? WHERE token = ?`
    ).bind(JSON.stringify(existingFiles), token).run();

    // Increment stats
    await incrementStat(c.env.DB, 'files_encrypted');
    await incrementStat(c.env.DB, 'total_file_size', fileSize || 0);

    return c.json({
      success: true,
      fileId,
      fileName
    }, 201);
  } catch (error) {
    console.error('Error completing upload:', error);
    return c.json({ error: 'Failed to complete upload' }, 500);
  }
});

// Upload encrypted media file (legacy endpoint for files <100MB)
app.post('/', rateLimitMiddleware(5, 60000), async (c) => {
  try {
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

    // Convert base64 to binary - chunked approach for large files
    const binaryString = atob(fileData);
    const binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }

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

    // Increment stats
    await incrementStat(c.env.DB, 'files_encrypted');
    await incrementStat(c.env.DB, 'total_file_size', binaryData.length);

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
app.get('/:fileId', async (c) => {
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

    // For large files (>100MB), stream directly from R2
    // This avoids loading entire file into Workers memory
    const fileSize = object.size;
    const fileName = object.customMetadata?.originalName || 'file';

    // Sanitize and encode filename for Content-Disposition
    const sanitizedFileName = fileName.replace(/[^\w\s.-]/g, '_');
    const encodedFileName = encodeURIComponent(sanitizedFileName);

    if (fileSize > 100 * 1024 * 1024) {
      // Stream response for large files
      return new Response(object.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize.toString(),
          'Content-Disposition': `attachment; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`,
          'X-File-IV': object.customMetadata.iv,
          'X-File-Salt': object.customMetadata.salt,
          'X-File-Name': encodedFileName,
          'Access-Control-Expose-Headers': 'X-File-IV, X-File-Salt, X-File-Name, Content-Disposition'
        }
      });
    }

    // For smaller files, use the existing base64 conversion method
    const arrayBuffer = await object.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK_SIZE = 8192; // Process 8KB at a time
    let binary = '';

    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
      binary += String.fromCharCode.apply(null, chunk);
    }

    const base64Data = btoa(binary);

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
app.delete('/:fileId', async (c) => {
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

export default app;

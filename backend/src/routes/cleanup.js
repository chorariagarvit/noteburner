import { Hono } from 'hono';

const app = new Hono();

// Cleanup expired messages (scheduled job)
app.get('/', async (c) => {
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

export default app;

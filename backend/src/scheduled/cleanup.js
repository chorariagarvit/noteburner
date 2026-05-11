// Scheduled cleanup handler for cron jobs
// Processes at most 500 items per run to stay within Worker CPU/time limits
const BATCH_LIMIT = 500;
const R2_CONCURRENCY = 25;

export async function cleanupScheduled(env) {
  console.log('Running scheduled cleanup job...');

  try {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Reset old daily stats
    await env.DB.prepare(
      `DELETE FROM stats WHERE period = 'today' AND date < ?`
    ).bind(today).run();

    // Reset old weekly stats
    const nowDate = new Date();
    const weekStart = new Date(nowDate);
    weekStart.setDate(nowDate.getDate() - nowDate.getDay());
    const weekDate = weekStart.toISOString().split('T')[0];
    await env.DB.prepare(
      `DELETE FROM stats WHERE period = 'this_week' AND date < ?`
    ).bind(weekDate).run();

    // 1. Find expired messages (bounded to BATCH_LIMIT per run)
    const messagesToDelete = await env.DB.prepare(
      `SELECT token, media_files FROM messages
       WHERE expires_at IS NOT NULL AND expires_at < ?
       LIMIT ?`
    ).bind(now, BATCH_LIMIT).all();

    const messages = messagesToDelete.results || [];

    if (messages.length > 0) {
      // Delete all R2 media files in parallel batches
      const allMediaFiles = messages.flatMap(m =>
        m.media_files ? JSON.parse(m.media_files) : []
      );
      for (let i = 0; i < allMediaFiles.length; i += R2_CONCURRENCY) {
        const chunk = allMediaFiles.slice(i, i + R2_CONCURRENCY);
        await Promise.allSettled(chunk.map(fileId => env.MEDIA_BUCKET.delete(fileId)));
      }

      // Batch-delete messages from D1
      const tokens = messages.map(m => m.token);
      const placeholders = tokens.map(() => '?').join(', ');
      await env.DB.prepare(
        `DELETE FROM messages WHERE token IN (${placeholders})`
      ).bind(...tokens).run();
    }

    // 2. Find media files marked for deletion (bounded to BATCH_LIMIT per run)
    const mediaToDelete = await env.DB.prepare(
      `SELECT file_id FROM media_cleanup WHERE delete_after < ? LIMIT ?`
    ).bind(now, BATCH_LIMIT).all();

    const mediaRows = mediaToDelete.results || [];

    if (mediaRows.length > 0) {
      // Delete R2 files in parallel batches
      const fileIds = mediaRows.map(r => r.file_id);
      for (let i = 0; i < fileIds.length; i += R2_CONCURRENCY) {
        const chunk = fileIds.slice(i, i + R2_CONCURRENCY);
        await Promise.allSettled(chunk.map(fileId => env.MEDIA_BUCKET.delete(fileId)));
      }

      // Batch-delete cleanup records from D1
      const placeholders = fileIds.map(() => '?').join(', ');
      await env.DB.prepare(
        `DELETE FROM media_cleanup WHERE file_id IN (${placeholders})`
      ).bind(...fileIds).run();
    }

    console.log('Cleanup completed:', {
      messagesDeleted: messages.length,
      mediaDeleted: mediaRows.length
    });
  } catch (error) {
    console.error('Scheduled cleanup error:', error);
  }
}

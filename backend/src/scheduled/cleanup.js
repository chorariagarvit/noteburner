// Scheduled cleanup handler for cron jobs
export async function cleanupScheduled(env) {
  console.log('Running scheduled cleanup job...');
  
  try {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Reset yesterday's stats (keep today's)
    await env.DB.prepare(
      `DELETE FROM stats WHERE period = 'today' AND date < ?`
    ).bind(today).run();

    // Reset old week stats
    const nowDate = new Date();
    const weekStart = new Date(nowDate);
    weekStart.setDate(nowDate.getDate() - nowDate.getDay());
    const weekDate = weekStart.toISOString().split('T')[0];

    await env.DB.prepare(
      `DELETE FROM stats WHERE period = 'this_week' AND date < ?`
    ).bind(weekDate).run();

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
        console.log('Deleted marked media file:', { fileId: row.file_id });
      } catch (err) {
        console.error('Failed to delete media file:', { fileId: row.file_id, error: err });
      }
    }

    console.log('Cleanup completed:', { 
      messagesDeleted: messagesToDelete.results.length, 
      mediaDeleted: markedMediaDeleted 
    });
  } catch (error) {
    console.error('Scheduled cleanup error:', error);
  }
}

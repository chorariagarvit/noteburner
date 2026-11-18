// Scheduled cleanup handler for cron jobs
// Processes at most 500 items per run to stay within Worker CPU/time limits
const BATCH_LIMIT = 500;
const R2_CONCURRENCY = 25;
// D1 allows at most 100 bound parameters per statement: delete in chunks well under that
const D1_CHUNK = 90;

async function deleteIn(db, table, column, values) {
  for (let i = 0; i < values.length; i += D1_CHUNK) {
    const chunk = values.slice(i, i + D1_CHUNK);
    await db.prepare(`DELETE FROM ${table} WHERE ${column} IN (${chunk.map(() => '?').join(', ')})`)
      .bind(...chunk).run();
  }
}

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
      await deleteIn(env.DB, 'messages', 'token', messages.map(m => m.token));
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
      await deleteIn(env.DB, 'media_cleanup', 'file_id', fileIds);
    }

    // 3. Housekeeping for tables that otherwise grow forever (each isolated so one failure
    //    doesn't stop the others)
    const nowIso = new Date().toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const housekeeping = [
      ['expired sessions', `DELETE FROM sessions WHERE expires_at < ?`, [nowIso]],
      ['used/expired password resets', `DELETE FROM password_resets WHERE used = 1 OR expires_at < ?`, [nowIso]],
      ['audit logs older than 30 days', `DELETE FROM audit_logs WHERE timestamp < datetime('now', '-30 days')`, []],
      ['old login attempts', `DELETE FROM login_attempts WHERE attempted_at < ?`, [monthAgo]],
      ['accessed messages', `DELETE FROM messages WHERE accessed = 1 AND created_at < ?`, [Date.now() - 7 * 24 * 3600 * 1000]],
    ];
    for (const [label, sql, params] of housekeeping) {
      try {
        await env.DB.prepare(sql).bind(...params).run();
      } catch (err) {
        console.error(`Cleanup step failed (${label}):`, err.message);
      }
    }

    console.log('Cleanup completed:', {
      messagesDeleted: messages.length,
      mediaDeleted: mediaRows.length
    });
  } catch (error) {
    console.error('Scheduled cleanup error:', error);
  }
}

// Helper function to increment stats
export async function incrementStat(db, metric, value = 1) {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Update all_time
    await db.prepare(
      `INSERT INTO stats (metric, value, period, date) 
       VALUES (?, ?, 'all_time', ?)
       ON CONFLICT(metric, period, date) 
       DO UPDATE SET value = value + ?, updated_at = CURRENT_TIMESTAMP`
    ).bind(metric, value, today, value).run();

    // Update today
    await db.prepare(
      `INSERT INTO stats (metric, value, period, date) 
       VALUES (?, ?, 'today', ?)
       ON CONFLICT(metric, period, date) 
       DO UPDATE SET value = value + ?, updated_at = CURRENT_TIMESTAMP`
    ).bind(metric, value, today, value).run();

    // Update this_week (calculate week start)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekDate = weekStart.toISOString().split('T')[0];

    await db.prepare(
      `INSERT INTO stats (metric, value, period, date) 
       VALUES (?, ?, 'this_week', ?)
       ON CONFLICT(metric, period, date) 
       DO UPDATE SET value = value + ?, updated_at = CURRENT_TIMESTAMP`
    ).bind(metric, value, weekDate, value).run();
  } catch (error) {
    console.error('Failed to increment stat:', { metric, error });
  }
}

// Stats period constants
export const PERIOD_ALL_TIME = 'all_time';
export const PERIOD_TODAY = 'today';
export const PERIOD_THIS_WEEK = 'this_week';

// Fixed date for all_time period accumulation
export const ALL_TIME_DATE = '1970-01-01';

// Helper function to increment stats
export async function incrementStat(db, metric, value = 1) {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Update all_time (uses fixed date for accumulation)
    await db.prepare(
      `INSERT INTO stats (metric, value, period, date) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(metric, period, date) 
       DO UPDATE SET value = value + ?, updated_at = CURRENT_TIMESTAMP`
    ).bind(metric, value, PERIOD_ALL_TIME, ALL_TIME_DATE, value).run();

    // Update today
    await db.prepare(
      `INSERT INTO stats (metric, value, period, date) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(metric, period, date) 
       DO UPDATE SET value = value + ?, updated_at = CURRENT_TIMESTAMP`
    ).bind(metric, value, PERIOD_TODAY, today, value).run();

    // Update this_week (calculate week start)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekDate = weekStart.toISOString().split('T')[0];

    await db.prepare(
      `INSERT INTO stats (metric, value, period, date) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(metric, period, date) 
       DO UPDATE SET value = value + ?, updated_at = CURRENT_TIMESTAMP`
    ).bind(metric, value, PERIOD_THIS_WEEK, weekDate, value).run();
  } catch (error) {
    console.error('Failed to increment stat:', { metric, error });
  }
}

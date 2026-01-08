import { Hono } from 'hono';
import { PERIOD_ALL_TIME, PERIOD_TODAY, PERIOD_THIS_WEEK, ALL_TIME_DATE } from '../utils/stats.js';

const app = new Hono();

// Get stats endpoint
app.get('/', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekDate = weekStart.toISOString().split('T')[0];

    // Get all stats
    const stats = await c.env.DB.prepare(
      `SELECT metric, value, period FROM stats 
       WHERE (period = ? AND date = ?) 
          OR (period = ? AND date = ?)
          OR (period = ? AND date = ?)`
    ).bind(PERIOD_ALL_TIME, ALL_TIME_DATE, PERIOD_TODAY, today, PERIOD_THIS_WEEK, weekDate).all();

    // Format response
    const response = {
      [PERIOD_ALL_TIME]: {},
      [PERIOD_TODAY]: {},
      [PERIOD_THIS_WEEK]: {}
    };

    for (const stat of stats.results) {
      response[stat.period][stat.metric] = stat.value;
    }

    // Calculate average file size
    if (response[PERIOD_ALL_TIME].files_encrypted > 0) {
      response[PERIOD_ALL_TIME].avg_file_size = Math.round(
        response[PERIOD_ALL_TIME].total_file_size / response[PERIOD_ALL_TIME].files_encrypted
      );
    }

    return c.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

export default app;

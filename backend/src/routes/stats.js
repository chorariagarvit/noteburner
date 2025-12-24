import { Hono } from 'hono';

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
       WHERE (period = 'all_time' AND date = ?) 
          OR (period = 'today' AND date = ?)
          OR (period = 'this_week' AND date = ?)`
    ).bind(today, today, weekDate).all();

    // Format response
    const response = {
      all_time: {},
      today: {},
      this_week: {}
    };

    for (const stat of stats.results) {
      response[stat.period][stat.metric] = stat.value;
    }

    // Calculate average file size
    if (response.all_time.files_encrypted > 0) {
      response.all_time.avg_file_size = Math.round(
        response.all_time.total_file_size / response.all_time.files_encrypted
      );
    }

    return c.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

export default app;

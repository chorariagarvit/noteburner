/**
 * Health Check and Monitoring Routes
 * Week 12 - Scaling & Performance
 */

import { Hono } from 'hono';
import { healthCheck, getPerformanceStats } from '../utils/monitoring.js';

const app = new Hono();

/**
 * GET /health
 * Health check endpoint for uptime monitoring
 */
app.get('/health', async (c) => {
  const health = await healthCheck(c.env);
  
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 503 : 500;
  
  return c.json(health, statusCode);
});

/**
 * GET /health/deep
 * Deep health check with detailed metrics
 */
app.get('/health/deep', async (c) => {
  const stats = await getPerformanceStats(c.env);
  return c.json(stats);
});

/**
 * GET /ping
 * Simple ping endpoint for basic uptime monitoring
 */
app.get('/ping', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'noteburner-api'
  });
});

export default app;

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { corsConfig } from './config/cors.js';
import messagesRouter from './routes/messages.js';
import mediaRouter from './routes/media.js';
import statsRouter from './routes/stats.js';
import cleanupRouter from './routes/cleanup.js';
import { cleanupScheduled } from './scheduled/cleanup.js';

const app = new Hono();

// CORS middleware
app.use('/*', cors(corsConfig));

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'NoteBurner API',
    version: '1.0.0'
  });
});

// Mount route modules
app.route('/api/messages', messagesRouter);
app.route('/api/media', mediaRouter);
app.route('/api/stats', statsRouter);
app.route('/api/cleanup', cleanupRouter);

// Export worker with both fetch and scheduled handlers
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    await cleanupScheduled(env);
  }
};

/**
 * Performance Monitoring & Observability Utilities
 * Week 12 - Scaling & Performance
 * 
 * Provides performance tracking, error monitoring, and uptime utilities
 */

/**
 * Performance metrics collection
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
  }

  /**
   * Start timing an operation
   * @param {string} label - Operation label
   * @returns {number} - Start timestamp
   */
  start(label) {
    const startTime = Date.now();
    this.metrics[label] = { startTime };
    return startTime;
  }

  /**
   * End timing and record duration
   * @param {string} label - Operation label
   * @returns {number} - Duration in milliseconds
   */
  end(label) {
    if (!this.metrics[label]) {
      console.warn(`No start time found for ${label}`);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - this.metrics[label].startTime;
    this.metrics[label].duration = duration;
    this.metrics[label].endTime = endTime;

    return duration;
  }

  /**
   * Get all collected metrics
   * @returns {Object} - All metrics
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Log performance metrics to console
   * @param {string} context - Context  label (e.g., "API Request")
   */
  log(context = 'Operation') {
    const summary = {};
    for (const [label, data] of Object.entries(this.metrics)) {
      if (data.duration) {
        summary[label] = `${data.duration}ms`;
      }
    }
    console.log(`[Performance] ${context}:`, summary);
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {};
  }
}

/**
 * Add performance headers to response
 * @param {Response} response - HTTP response
 * @param {Object} metrics - Performance metrics
 * @returns {Response} - Response with performance headers
 */
export function addPerformanceHeaders(response, metrics) {
  const headers = new Headers(response.headers);
  
  // Server timing header for Chrome DevTools
  const timings = [];
  for (const [label, data] of Object.entries(metrics)) {
    if (data.duration) {
      // format: label;dur=duration
      timings.push(`${label};dur=${data.duration}`);
    }
  }
  
  if (timings.length > 0) {
    headers.set('Server-Timing', timings.join(', '));
  }

  // Add custom performance header
  const totalDuration = Object.values(metrics)
    .reduce((sum, m) => sum + (m.duration || 0), 0);
  headers.set('X-Response-Time', `${totalDuration}ms`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Error tracking and reporting
 */
export class ErrorTracker {
  constructor(env) {
    this.env = env;
    this.errors = [];
  }

  /**
   * Track an error
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  track(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      context,
      // Don't log sensitive data
      sanitized: true
    };

    this.errors.push(errorData);
    
    // Log to console (Cloudflare logs)
    console.error('[Error Tracked]', {
      message: error.message,
      context: context.endpoint || context.operation || 'unknown',
      timestamp: errorData.timestamp
    });

    // In production, you could send to Sentry or other error tracking service
    if (this.env.SENTRY_DSN) {
      this.sendToSentry(errorData);
    }
  }

  /**
   * Send error to Sentry (placeholder for future implementation)
   * @param {Object} errorData - Error data
   */
  async sendToSentry(errorData) {
    // Placeholder for Sentry integration
    // In production:
    // await fetch(this.env.SENTRY_DSN, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // });
    console.log('[Sentry] Would send error:', errorData.message);
  }

  /**
   * Get all tracked errors
   * @returns {Array} - Array of error objects
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Clear tracked errors
   */
  clear() {
    this.errors = [];
  }
}

/**
 * Uptime monitoring ping
 * @param {Object} env - Environment bindings
 * @returns {Promise<Object>} - Health check result
 */
export async function healthCheck(env) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Check D1 database
    const dbStart = Date.now();
    try {
      await env.DB.prepare('SELECT 1').first();
      checks.checks.database = {
        status: 'up',
        responseTime: Date.now() - dbStart
      };
    } catch (error) {
      checks.checks.database = {
        status: 'down',
        error: error.message
      };
      checks.status = 'degraded';
    }

    // Check KV cache (if configured)
    if (env.CACHE) {
      const kvStart = Date.now();
      try {
        await env.CACHE.get('health-check');
        checks.checks.cache = {
          status: 'up',
          responseTime: Date.now() - kvStart
        };
      } catch (error) {
        checks.checks.cache = {
          status: 'down',
          error: error.message
        };
      }
    }

    // Check R2 storage
    if (env.MEDIA_BUCKET) {
      checks.checks.storage = {
        status: 'configured',
        note: 'R2 bucket available'
      };
    }

    return checks;
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Middleware to add performance monitoring to requests
 * @param {Function} handler - Request handler
 * @returns {Function} - Wrapped handler with performance monitoring
 */
export function withPerformanceMonitoring(handler) {
  return async (c) => {
    const monitor = new PerformanceMonitor();
    
    // Track total request time
    monitor.start('total');
    
    // Add monitor to context
    c.set('performanceMonitor', monitor);
    c.set('errorTracker', new ErrorTracker(c.env));
    
    try {
      const response = await handler(c);
      
      monitor.end('total');
      monitor.log(`${c.req.method} ${c.req.path}`);
      
      // Add performance headers
      return addPerformanceHeaders(response, monitor.getMetrics());
    } catch (error) {
      monitor.end('total');
      const errorTracker = c.get('errorTracker');
      errorTracker.track(error, {
        method: c.req.method,
        path: c.req.path,
        endpoint: `${c.req.method} ${c.req.path}`
      });
      throw error;
    }
  };
}

/**
 * Calculate request rate (requests per second)
 * @param {number} count - Number of requests
 * @param {number} windowMs - Time window in milliseconds
 * @returns {number} - Requests per second
 */
export function calculateRequestRate(count, windowMs) {
  return (count / windowMs) * 1000;
}

/**
 * Get performance statistics
 * @param {Object} env - Environment bindings
 * @returns {Promise<Object>} - Performance stats
 */
export async function getPerformanceStats(env) {
  try {
    // Get basic stats from database
    const result = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_messages,
        AVG(CASE WHEN accessed_at IS NOT NULL 
          THEN (accessed_at - created_at) 
          ELSE NULL END) as avg_time_to_access
      FROM messages
      WHERE created_at > ?
    `).bind(Date.now() - 86400000).first(); // Last 24 hours

    const health = await healthCheck(env);

    return {
      health,
      metrics: {
        total_messages_24h: result.total_messages || 0,
        avg_time_to_access_ms: result.avg_time_to_access || 0,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error getting performance stats:', error);
    return {
      error: 'Failed to get performance stats',
      timestamp: new Date().toISOString()
    };
  }
}

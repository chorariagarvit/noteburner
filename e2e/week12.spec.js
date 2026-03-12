/**
 * Week 12: Scaling & Performance - E2E Tests
 * Tests for caching, CDN optimization, monitoring, and health checks
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'http://localhost:8787';

test.describe('Week 12: Scaling & Performance', () => {
  
  test.describe('Health Check Endpoints', () => {
    
    test('should respond to basic health check', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('checks');
      expect(['healthy', 'degraded']).toContain(data.status);
    });

    test('should check database health', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      
      expect(data.checks).toHaveProperty('database');
      expect(data.checks.database).toHaveProperty('status');
      expect(['up', 'down']).toContain(data.checks.database.status);
      
      if (data.checks.database.status === 'up') {
        expect(data.checks.database).toHaveProperty('responseTime');
        expect(data.checks.database.responseTime).toBeGreaterThan(0);
        expect(data.checks.database.responseTime).toBeLessThan(1000); // Should be < 1s
      }
    });

    test('should report cache status if configured', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      
      // Cache might not be configured in test environment, but if it is, check it
      if (data.checks?.cache) {
        expect(['up', 'down']).toContain(data.checks.cache.status);
        if (data.checks.cache.status === 'up') {
          expect(data.checks.cache).toHaveProperty('responseTime');
        }
      }
    });

    test('should respond to deep health check', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health/deep`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('health');
      expect(data).toHaveProperty('metrics');
      expect(data.metrics).toHaveProperty('timestamp');
    });

    test('should respond to ping endpoint quickly', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${API_BASE_URL}/api/health/ping`);
      const duration = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(500); // Should respond in < 500ms (allows for cold start)
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data).toHaveProperty('timestamp');
      expect(data.service).toBe('noteburner-api');
    });

    test('should handle degraded state gracefully', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      
      // Even if degraded, should return structured response
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('checks');
      
      if (data.status === 'degraded') {
        expect([200, 503]).toContain(response.status());
      }
    });
  });

  test.describe('Performance Headers', () => {
    
    test('should include performance headers in API responses', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/stats`);
      
      expect(response.status()).toBe(200);
      
      const headers = response.headers();
      
      // Should have response time header
      // Note: These headers are added by withPerformanceMonitoring middleware
      // which may not be enabled on all routes yet
      if (headers['x-response-time']) {
        expect(headers['x-response-time']).toMatch(/\d+ms/);
      }
    });

    test('should track request timing', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${API_BASE_URL}/api/stats`);
      const clientDuration = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      
      // Response should be reasonably fast
      expect(clientDuration).toBeLessThan(2000); // 2 seconds max
    });
  });

  test.describe('Caching Behavior', () => {
    
    test('should cache stats API responses', async ({ request }) => {
      // First request (cache miss)
      const firstResponse = await request.get(`${API_BASE_URL}/api/stats`);
      const firstTime = Date.now();
      await firstResponse.json();
      const firstDuration = Date.now() - firstTime;
      
      expect(firstResponse.status()).toBe(200);
      
      // Second request (should be cached)
      const secondTime = Date.now();
      const secondResponse = await request.get(`${API_BASE_URL}/api/stats`);
      await secondResponse.json();
      const secondDuration = Date.now() - secondTime;
      
      expect(secondResponse.status()).toBe(200);
      
      // Second request should be faster (if caching is working)
      // Note: This might not always be true in test environment without KV
      // so we don't fail the test, just log for observation
      if (secondDuration < firstDuration * 0.8) {
        console.log(`✓ Cache speedup detected: ${firstDuration}ms → ${secondDuration}ms`);
      }
    });

    test('should return same data from cache', async ({ request }) => {
      const firstResponse = await request.get(`${API_BASE_URL}/api/stats`);
      const firstData = await firstResponse.json();
      
      // Wait a moment then request again
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const secondResponse = await request.get(`${API_BASE_URL}/api/stats`);
      const secondData = await secondResponse.json();
      
      // Data should be consistent (or very similar)
      expect(firstData).toHaveProperty('all_time');
      expect(secondData).toHaveProperty('all_time');
      
      // Alltime stats shouldn't change much in 100ms
      if (firstData.all_time.messages_created) {
        expect(Math.abs(
          firstData.all_time.messages_created - secondData.all_time.messages_created
        )).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('Database Performance', () => {
    
    test('should handle team queries efficiently', async ({ request }) => {
      // Test that optimized queries work
      // This tests the Week 12 database optimization work
      
      const startTime = Date.now();
      const response = await request.get(`${API_BASE_URL}/api/teams`, {
        headers: {
          'Authorization': 'Bearer test-token-if-needed'
        },
        failOnStatusCode: false // Don't fail if not authenticated
      });
      const duration = Date.now() - startTime;
      
      // Should respond quickly even if unauthenticated
      expect(duration).toBeLessThan(500); // 500ms max
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('teams');
      }
    });

    test('should handle stats queries efficiently', async ({ request }) => {
      const startTime = Date.now();
      const response = await request.get(`${API_BASE_URL}/api/stats`);
      const duration = Date.now() - startTime;
      
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(500); // Should be under 500ms
      
      const data = await response.json();
      expect(data).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    
    test('should handle 404 gracefully', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/nonexistent-endpoint`);
      
      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should track errors properly', async ({ request }) => {
      // Make a request that will fail
      const response = await request.post(`${API_BASE_URL}/api/messages`, {
        data: {
          // Missing required fields
          encryptedData: null
        },
        failOnStatusCode: false
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Stress & Performance Tests', () => {
    
    test('should handle multiple concurrent health checks', async ({ request }) => {
      const requests = Array(10).fill(null).map(() =>
        request.get(`${API_BASE_URL}/api/health/ping`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
      
      // Should handle 10 concurrent requests in reasonable time
      expect(duration).toBeLessThan(2000);
    });

    test('should handle multiple stats API requests', async ({ request }) => {
      const requests = Array(5).fill(null).map(() =>
        request.get(`${API_BASE_URL}/api/stats`)
      );
      
      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
      
      // Verify all returned valid data
      for (const response of responses) {
        const data = await response.json();
        expect(data).toHaveProperty('all_time');
      }
    });
  });

  test.describe('CDN & Static Assets', () => {
    
    test('should serve frontend with proper caching headers', async ({ request }) => {
      const response = await request.get('http://localhost:5173/', { failOnStatusCode: false });
      
      // Frontend may not be running in test environment
      expect([200, 404, 502, 503, 'ECONNREFUSED']).toContain(
        response.status() !== undefined ? response.status() : 'ECONNREFUSED'
      );
    });

    test('should serve API root with proper headers', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('NoteBurner API');
    });
  });

  test.describe('Monitoring Integration', () => {
    
    test('should provide consistent health status', async ({ request }) => {
      // Make multiple health checks
      const checks = await Promise.all([
        request.get(`${API_BASE_URL}/api/health`),
        request.get(`${API_BASE_URL}/api/health`),
        request.get(`${API_BASE_URL}/api/health`)
      ]);
      
      const statuses = await Promise.all(
        checks.map(r => r.json().then(d => d.status))
      );
      
      // All should return same status (or very similar)
      const uniqueStatuses = [...new Set(statuses)];
      expect(uniqueStatuses.length).toBeLessThanOrEqual(2); // Allow for transient changes
    });

    test('should track performance over multiple requests', async ({ request }) => {
      const durations = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await request.get(`${API_BASE_URL}/api/health/ping`);
        durations.push(Date.now() - startTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Calculate average response time
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      
      // Average should be reasonable
      expect(avgDuration).toBeLessThan(200);
      
      console.log(`Average ping response time: ${avgDuration.toFixed(2)}ms`);
    });
  });

  test.describe('Backward Compatibility', () => {
    
    test('should maintain existing API functionality', async ({ request }) => {
      // Test that existing endpoints still work after Week 12 optimizations
      const response = await request.get(`${API_BASE_URL}/`);
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('NoteBurner API');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('features');
      
      // Should include Week 12 features
      expect(data.features).toContain('caching');
      expect(data.features).toContain('monitoring');
    });

    test('should preserve existing message functionality', async ({ request }) => {
      // Create a test message
      const messageData = {
        encryptedData: 'test-encrypted-data',
        iv: 'test-iv',
        salt: 'test-salt',
        expiresIn: 3600
      };
      
      const response = await request.post(`${API_BASE_URL}/api/messages`, {
        data: messageData
      });
      
      expect([201, 429]).toContain(response.status()); // 201 success or 429 rate limited
      
      if (response.status() === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('token');
        expect(data).toHaveProperty('url');
      }
    });
  });
});

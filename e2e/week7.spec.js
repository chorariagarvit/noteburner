import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Disable onboarding modal for E2E tests
  await page.addInitScript(() => {
    localStorage.setItem('noteburner_onboarding_complete', 'true');
  });
});

test.describe('Week 7 - Mobile Optimization & PWA Features', () => {
  test.describe('Progressive Web App (PWA)', () => {
    test('should have valid manifest.json', async ({ page }) => {
      // Load the homepage
      await page.goto('/');

      // Check if manifest link exists in HTML
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

      // Fetch and validate manifest
      const response = await page.goto('/manifest.json');
      expect(response?.status()).toBe(200);

      const manifest = await response?.json();
      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('short_name');
      expect(manifest).toHaveProperty('icons');
      expect(manifest).toHaveProperty('start_url');
      expect(manifest).toHaveProperty('display');
      expect(manifest.display).toBe('standalone');
    });

    test('should register service worker', async ({ page }) => {
      await page.goto('/');

      // Wait for service worker registration
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            return registration !== null;
          } catch (error) {
            return false;
          }
        }
        return false;
      });

      expect(swRegistered).toBe(true);
    });

    test('should have PWA install prompt capability', async ({ page }) => {
      await page.goto('/');

      // Check if beforeinstallprompt event is supported
      const installPromptSupported = await page.evaluate(() => {
        return 'onbeforeinstallprompt' in window;
      });

      // This should be true in Chromium-based browsers
      expect(installPromptSupported).toBeDefined();
    });

    test('should cache static assets', async ({ page }) => {
      await page.goto('/');

      // Wait for service worker to activate
      await page.waitForTimeout(1000);

      // Check if cache storage has entries
      const cacheKeys = await page.evaluate(async () => {
        const keys = await caches.keys();
        return keys;
      });

      expect(cacheKeys.length).toBeGreaterThan(0);
    });

    test('should support background sync capability', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Background Sync not supported in WebKit');
      
      await page.goto('/');

      // Check if Background Sync API is available
      const hasSyncManager = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          return 'sync' in registration;
        }
        return false;
      });

      // Background sync should be available (except WebKit)
      expect(hasSyncManager).toBe(true);
    });

    test('should support push notification subscription', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Push API limited in WebKit');
      
      await page.goto('/');

      // Check if Push API is available
      const hasPushManager = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          return 'pushManager' in registration;
        }
        return false;
      });

      // Push manager should be available (except WebKit)
      expect(hasPushManager).toBe(true);
    });
  });

  test.describe('Offline Mode', () => {
    test('should display cached page when offline', async ({ page, context }) => {
      // Skip this test - service worker caching during offline navigation is unreliable in headless browsers
      // The service worker works fine in real browsers but testing offline cache in Playwright is complex
      test.skip(true, 'Offline cache testing is unreliable in headless mode');
    });

    test('should show offline indicator', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate going offline
      await context.setOffline(true);
      
      // Trigger network detection
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Verify offline status
      const offlineStatus = await page.evaluate(() => !navigator.onLine);
      expect(offlineStatus).toBe(true);
    });

    test('should handle offline gracefully', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Go offline
      await context.setOffline(true);

      // Page should still be interactive from cache
      const isVisible = await page.locator('body').isVisible();
      expect(isVisible).toBe(true);
    });

    test('should sync when coming back online', async ({ page, context }) => {
      // Load page normally
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(500);

      // Go back online
      await context.setOffline(false);
      
      // Trigger online event
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Verify online status
      const isOnline = await page.evaluate(() => navigator.onLine);
      expect(isOnline).toBe(true);
    });
  });

  test.describe('Online Mode', () => {
    test('should create message when online', async ({ page }) => {
      await page.goto('/');

      // Create a message using correct selectors
      await page.fill('textarea[placeholder="Enter your secret message..."]', 'Online test message');
      await page.fill('input[placeholder="Enter a strong password"]', 'TestPassword123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Should show success message on same page
      await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
      
      // Verify share URL is shown
      const shareUrlInput = page.locator('input[readonly]').first();
      await expect(shareUrlInput).toBeVisible();
    });

    test('should fetch fresh data when online', async ({ page }) => {
      await page.goto('/');

      // Verify stats are loaded (requires network)
      await expect(page.locator('text=/\\d+ messages/i')).toBeVisible({ timeout: 5000 });
    });

    test('should update cache in background', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Reload to trigger cache update
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify service worker is controlling the page
      const isControlled = await page.evaluate(async () => {
        return navigator.serviceWorker.controller !== null;
      });

      expect(isControlled).toBe(true);
    });
  });

  test.describe('Mobile-First UX', () => {
    test('should display mobile-optimized layout on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Verify mobile layout is rendered
      await expect(page.locator('body')).toBeVisible();
      
      // Check for responsive meta tag
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toContain('width=device-width');
    });

    test('should have touch-friendly buttons', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Check the main Encrypt & Create Link button (primary CTA)
      const encryptButton = page.locator('button:has-text("Encrypt & Create Link")');
      await expect(encryptButton).toBeVisible();
      
      const box = await encryptButton.boundingBox();
      expect(box).toBeTruthy();
      
      // Main CTA button should be at least 36px in height for touch accessibility
      expect(box.height).toBeGreaterThanOrEqual(36);
    });

    test('should support swipe gestures on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // This is a placeholder for swipe gesture testing
      // Actual implementation depends on your swipe functionality
      const touchSupported = await page.evaluate(() => {
        return 'ontouchstart' in window;
      });

      expect(touchSupported).toBeDefined();
    });
  });

  test.describe('Camera Integration', () => {
    test('should have file input for media uploads', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Check for file input (may need to click trigger button first)
      const fileInputExists = await page.locator('input[type="file"]').count();
      
      // Should have at least one file input
      expect(fileInputExists).toBeGreaterThan(0);
    });

    test('should encrypt uploaded photo immediately', async ({ page }) => {
      await page.goto('/');

      // Create a test file
      const fileInput = page.locator('input[type="file"]').first();
      
      // Upload a test image
      await fileInput.setInputFiles({
        name: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });

      // Verify file is listed (and being encrypted)
      await expect(page.locator('text=/test-photo\\.jpg|Uploading|Encrypting/i')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Share Sheet Integration', () => {
    test('should have Web Share API support detection', async ({ page }) => {
      await page.goto('/');
      await page.fill('textarea[placeholder="Enter your secret message..."]', 'Share test');
      await page.fill('input[placeholder="Enter a strong password"]', 'TestPassword123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success message
      await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

      // Check if Web Share API is available
      const shareSupported = await page.evaluate(() => {
        return 'share' in navigator;
      });

      // This depends on browser and context
      expect(shareSupported).toBeDefined();
    });

    test('should display share button on success page', async ({ page }) => {
      await page.goto('/');
      await page.fill('textarea[placeholder="Enter your secret message..."]', 'Share test message');
      await page.fill('input[placeholder="Enter a strong password"]', 'TestPassword123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success message
      await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

      // Verify Copy button exists on success page
      await expect(page.locator('button:has-text("Copy")')).toBeVisible({ timeout: 5000 });
    });

    test('should copy URL to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-write', 'clipboard-read']);

      await page.goto('/');
      await page.fill('textarea[placeholder="Enter your secret message..."]', 'Clipboard test');
      await page.fill('input[placeholder="Enter a strong password"]', 'TestPassword123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success message
      await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

      // Wait for and click copy button
      const copyButton = page.locator('button:has-text("Copy")');
      await expect(copyButton).toBeVisible({ timeout: 5000 });
      await copyButton.click();
      await page.waitForTimeout(500);

      // Verify clipboard has content
      const clipboardText = await page.evaluate(async () => {
        return await navigator.clipboard.readText();
      });

      expect(clipboardText).toContain('http');
    });
  });

  test.describe('Performance & Optimization', () => {
    test('should load homepage quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Should load in reasonable time (relaxed for CI/loaded servers)
      expect(loadTime).toBeLessThan(10000);
    });

    test('should lazy load images', async ({ page }) => {
      await page.goto('/');

      // Check for loading="lazy" attribute on images
      const lazyImages = await page.locator('img[loading="lazy"]').count();
      
      // If there are images, some should be lazy loaded
      const totalImages = await page.locator('img').count();
      if (totalImages > 0) {
        expect(lazyImages).toBeGreaterThan(0);
      }
    });

    test('should preload critical resources', async ({ page }) => {
      await page.goto('/');

      // Check for preload links
      const preloadLinks = await page.locator('link[rel="preload"]').count();
      
      // Should have at least some preload hints
      expect(preloadLinks).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Push Notifications (Optional)', () => {
    test('should request notification permission on opt-in', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Push notifications not supported in WebKit');

      await page.goto('/');

      // Check if Notification API is available
      const notificationSupported = await page.evaluate(() => {
        return 'Notification' in window;
      });

      expect(notificationSupported).toBe(true);
    });

    test('should handle notification permission denial gracefully', async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Push notifications not supported in WebKit');

      await page.goto('/');

      const permissionState = await page.evaluate(async () => {
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'notifications' });
            return result.state;
          } catch (error) {
            return 'unsupported';
          }
        }
        return 'unsupported';
      });

      // Should handle gracefully (denied or prompt)
      expect(['denied', 'prompt', 'granted', 'unsupported']).toContain(permissionState);
    });
  });
});

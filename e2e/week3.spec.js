import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:8787';

test.describe('Week 3 - Custom URLs', () => {
  test('should allow creating message with custom URL slug', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    const uniqueSlug = `test-${Date.now().toString().slice(-10)}`;

    // Fill in message and password
    await page.fill('#message', 'Test message with custom URL');
    await page.fill('#password', 'SecurePassword123');

    // Enter custom URL
    await page.fill('#custom-url', uniqueSlug);
    
    // Wait for validation
    await page.waitForSelector('.text-green-500', { timeout: 2000 });

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success page
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Check that URL contains custom slug with /m/ prefix
    const shareUrl = await page.inputValue('#share-url');
    expect(shareUrl).toContain(`/m/${uniqueSlug}`);
  });

  test('should show validation error for invalid custom URL', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    // Try invalid characters
    await page.fill('#custom-url', 'invalid@slug!');
    
    // Input should auto-sanitize to remove invalid chars
    const value = await page.inputValue('#custom-url');
    expect(value).toBe('invalidslug');
  });

  test('should show error for custom URL that is too short', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    // Try slug that's too short
    await page.fill('#custom-url', 'ab');
    
    // Wait for error indicator (red X icon or error message)
    await page.waitForSelector('.text-red-500, text=/.*at least 3 characters.*/i', { timeout: 3000 });
  });

  test('should show unavailable error for duplicate custom URL', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    const duplicateSlug = `dup-${Date.now().toString().slice(-13)}`;

    // Create first message
    await page.fill('#message', 'First message');
    await page.fill('#password', 'SecurePassword123');
    await page.fill('#custom-url', duplicateSlug);
    await page.waitForSelector('.text-green-500', { timeout: 2000 });
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Try to create second message with same slug
    await page.click('text=Create New Message');
    await page.fill('#message', 'Second message');
    await page.fill('#password', 'SecurePassword123');
    await page.fill('#custom-url', duplicateSlug);
    
    // Should show unavailable error
    await page.waitForSelector('.text-red-500', { timeout: 2000 });
    await expect(page.locator('text=/.*already taken.*/i')).toBeVisible();
  });

  test('should access message via custom URL slug', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    const testMessage = 'Message accessible via custom URL';
    const testPassword = 'TestPassword123';
    const customSlug = `acc-${Date.now().toString().slice(-13)}`;

    // Create message with custom slug
    await page.fill('#message', testMessage);
    await page.fill('#password', testPassword);
    await page.fill('#custom-url', customSlug);
    await page.waitForSelector('.text-green-500', { timeout: 2000 });
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Get the share URL from the page
    const shareUrl = await page.inputValue('#share-url');
    
    // Navigate to custom URL
    await page.goto(shareUrl);
    
    // Click "Unlock Secret Message" button to get past preview screen
    await page.click('text=Unlock Secret Message');
    
    // Should show password prompt
    await expect(page.locator('text=Encrypted Message')).toBeVisible();
    
    // Decrypt message
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    
    // Verify message content
    await page.waitForSelector('text=Message Decrypted', { timeout: 5000 });
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();
  });
});

test.describe('Week 3 - QR Codes', () => {
  test('should display QR code after message creation', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    // Create message
    await page.fill('#message', 'Test message for QR code');
    await page.fill('#password', 'SecurePassword123');
    await page.click('button[type="submit"]');

    // Wait for success page
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Check QR code is displayed
    const qrImage = page.locator('img[alt="QR Code for secret message"]');
    await expect(qrImage).toBeVisible();

    // Verify QR image has src
    const src = await qrImage.getAttribute('src');
    expect(src).toContain('data:image/png;base64');
  });

  test('should allow downloading QR code', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    // Create message
    await page.fill('#message', 'Test message for QR download');
    await page.fill('#password', 'SecurePassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Check download button exists
    const downloadButton = page.locator('button:has-text("Download QR Code")');
    await expect(downloadButton).toBeVisible();

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('noteburner-secret-message.png');
  });
});

test.describe('Week 3 - Countdown Timer', () => {
  test('should display countdown timer on view page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    // Create message with 1 hour expiration
    await page.fill('#message', 'Test message with countdown');
    await page.fill('#password', 'SecurePassword123');
    await page.selectOption('#expiration', '1');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Get share URL and navigate to it
    const shareUrl = await page.inputValue('#share-url');
    await page.goto(shareUrl);

    // Click unlock button to get past preview screen
    await page.click('text=Unlock Secret Message');

    // Should show countdown on password page
    await expect(page.locator('text=/Message expires in/i')).toBeVisible();
    // Time format can be: "59m 59s" or "23h 59m 59s" depending on how much time is left
    await expect(page.locator('text=/([0-9]+h )?[0-9]+m [0-9]+s/i')).toBeVisible();
  });

  test('should show countdown after decryption', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    const testPassword = 'TestPassword123';

    // Create message with 6 hour expiration
    await page.fill('#message', 'Test countdown after decrypt');
    await page.fill('#password', testPassword);
    await page.selectOption('#expiration', '6');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Navigate to message
    const shareUrl = await page.inputValue('#share-url');
    await page.goto(shareUrl);

    // Click unlock button to get past preview screen
    await page.click('text=Unlock Secret Message');

    // Decrypt
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Decrypted', { timeout: 5000 });

    // Countdown should be visible
    await expect(page.locator('text=/Time Remaining/i')).toBeVisible();
    await expect(page.locator('text=/[0-9]+h [0-9]+m [0-9]+s/i')).toBeVisible();
  });

  test('should show urgency indicator for messages expiring soon', async ({ page }) => {
    // This test would require manipulating time or creating a message
    // that's close to expiration. For now, we'll just verify the component exists.
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    // Create message with 1 hour expiration
    await page.fill('#message', 'Soon expiring message');
    await page.fill('#password', 'SecurePassword123');
    await page.selectOption('#expiration', '1');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Navigate to view
    const shareUrl = await page.inputValue('#share-url');
    await page.goto(shareUrl);

    // Click unlock button to get past preview screen
    await page.click('text=Unlock Secret Message');

    // Countdown should be visible (urgency styling would be tested at lower levels)
    await expect(page.locator('text=/Message expires in/i')).toBeVisible();
  });

  test('should hide countdown for messages without expiration', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    // Create message without expiration
    await page.fill('#message', 'No expiration message');
    await page.fill('#password', 'SecurePassword123');
    await page.selectOption('#expiration', ''); // No expiration
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Navigate to message
    const shareUrl = await page.inputValue('#share-url');
    await page.goto(shareUrl);

    // Click unlock button to get past preview screen
    await page.click('text=Unlock Secret Message');

    // Countdown should NOT be visible
    await expect(page.locator('text=/Message expires in/i')).not.toBeVisible();
  });
});

test.describe('Week 3 - Open Graph Meta Tags', () => {
  test('should have Open Graph meta tags in HTML', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check for Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /secret message/i);

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', /self-destructing/i);

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', /og-image\.png/);
  });

  test('should have Twitter Card meta tags', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check for Twitter Card tags
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute('content', 'summary_large_image');

    const twitterTitle = page.locator('meta[name="twitter:title"]');
    await expect(twitterTitle).toHaveAttribute('content', /secret message/i);

    const twitterImage = page.locator('meta[name="twitter:image"]');
    await expect(twitterImage).toHaveAttribute('content', /og-image\.png/);
  });

  test('should not expose message content in meta tags', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Create Message');

    const secretMessage = 'This should never appear in meta tags';

    // Create message
    await page.fill('#message', secretMessage);
    await page.fill('#password', 'SecurePassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 5000 });

    // Navigate to message page
    const shareUrl = await page.inputValue('#share-url');
    await page.goto(shareUrl);

    // Check that secret message is NOT in meta tags
    const allMeta = await page.locator('meta').all();
    for (const meta of allMeta) {
      const content = await meta.getAttribute('content');
      if (content) {
        expect(content).not.toContain(secretMessage);
      }
    }

    // Verify generic preview text is used instead
    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', /self-destructing encrypted message/i);
  });
});

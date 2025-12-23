import { test, expect } from '@playwright/test';

test.describe('Message Creation', () => {
  test('should create a simple text message', async ({ page }) => {
    // Log console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    await page.goto('/');

    // Fill in message
    await page.fill('textarea[placeholder="Enter your secret message..."]', 'This is a test secret message!');

    // Fill in password
    await page.fill('input[placeholder="Enter a strong password"]', 'TestPassword123!');

    // Submit form
    await page.click('button:has-text("Encrypt & Create Link")');

    // Wait for success page
    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    // Verify URL is shown
    const shareUrlInput = page.locator('input[readonly]').first();
    await expect(shareUrlInput).toBeVisible();
    const shareUrl = await shareUrlInput.inputValue();
    expect(shareUrl).toContain('http://localhost:5173/m/');

    // Verify password is displayed
    await expect(page.locator('text=TestPassword123!')).toBeVisible();
  });

  test('should generate a random password', async ({ page }) => {
    await page.goto('/');

    // Click generate password button
    await page.click('button:has-text("Generate")');

    // Verify password field is filled
    const passwordInput = page.locator('input[placeholder="Enter a strong password"]');
    const generatedPassword = await passwordInput.inputValue();
    expect(generatedPassword.length).toBeGreaterThanOrEqual(16);
  });

  test('should create message with expiration', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Expiring message');
    await page.fill('input[placeholder="Enter a strong password"]', 'ExpireTest123!');

    // Select 1 hour expiration
    await page.selectOption('select', '1');

    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Message expires in 1 hour(s)')).toBeVisible();
  });

  test('should create message with file attachment', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Message with file');
    await page.fill('input[placeholder="Enter a strong password"]', 'FileTest123!');

    // Upload a test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a test file content'),
    });

    // Verify file is shown
    await expect(page.locator('text=test.txt')).toBeVisible();

    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=1 encrypted file(s) attached')).toBeVisible();
  });

  test('should validate minimum password length', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Test message');
    await page.fill('input[placeholder="Enter a strong password"]', 'short');

    await page.click('button:has-text("Encrypt & Create Link")');

    // Should show validation error (browser native or custom)
    const passwordInput = page.locator('input[placeholder="Enter a strong password"]');
    await expect(passwordInput).toHaveAttribute('minlength', '8');
  });

  test('should copy share URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Clipboard test');
    await page.fill('input[placeholder="Enter a strong password"]', 'ClipTest123!');
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    // Click copy button
    await page.click('button:has-text("Copy")');

    // Verify button text changes
    await expect(page.locator('button:has-text("Copied!")')).toBeVisible();

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('http://localhost:5173/m/');
  });

  test('should use "Create Similar Message" feature', async ({ page }) => {
    await page.goto('/');

    const testPassword = 'SimilarTest123!';
    await page.fill('textarea[placeholder="Enter your secret message..."]', 'First message');
    await page.fill('input[placeholder="Enter a strong password"]', testPassword);
    await page.selectOption('select', '6'); // 6 hours
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    // Click "Create Similar Message"
    await page.click('button:has-text("Create Similar Message")');

    // Verify we're back on the create form
    await expect(page.locator('h2:has-text("Create Encrypted Message")')).toBeVisible();

    // Verify password and expiration are preserved
    const passwordInput = page.locator('input[placeholder="Enter a strong password"]');
    expect(await passwordInput.inputValue()).toBe(testPassword);

    const expirationSelect = page.locator('select');
    expect(await expirationSelect.inputValue()).toBe('6');

    // Verify message is cleared
    const messageTextarea = page.locator('textarea[placeholder="Enter your secret message..."]');
    expect(await messageTextarea.inputValue()).toBe('');
  });

  test('should reset all fields with "Create New Message"', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Test message');
    await page.fill('input[placeholder="Enter a strong password"]', 'ResetTest123!');
    await page.selectOption('select', '24');
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    // Click "Create New Message"
    await page.click('button:has-text("Create New Message")');

    // Verify all fields are reset
    const messageTextarea = page.locator('textarea[placeholder="Enter your secret message..."]');
    expect(await messageTextarea.inputValue()).toBe('');

    const passwordInput = page.locator('input[placeholder="Enter a strong password"]');
    expect(await passwordInput.inputValue()).toBe('');

    const expirationSelect = page.locator('select');
    expect(await expirationSelect.inputValue()).toBe('24'); // Default
  });
});

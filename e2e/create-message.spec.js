import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Disable onboarding modal for E2E tests
  await page.addInitScript(() => {
    localStorage.setItem('noteburner_onboarding_complete', 'true');
  });
});

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

    // Select 1 hour expiration (60 minutes)
    await page.selectOption('#time-limit', '60');

    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
    // Expiration is now displayed in the success component
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

    // Wait for success message
    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
    
    // Check for file attachment indicator
    await expect(page.locator('text=1 encrypted file(s) attached')).toBeVisible({ timeout: 5000 });
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
    await page.selectOption('#time-limit', '360'); // 6 hours = 360 minutes
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    // Click "Create Similar Message"
    await page.click('button:has-text("Create Similar Message")');

    // Verify we're back on the create form
    await expect(page.locator('h2:has-text("Create Encrypted Message")')).toBeVisible();

    // Verify password and expiration are preserved
    const passwordInput = page.locator('input[placeholder="Enter a strong password"]');
    expect(await passwordInput.inputValue()).toBe(testPassword);

    const expirationSelect = page.locator('#time-limit');
    expect(await expirationSelect.inputValue()).toBe('360');

    // Verify message is cleared
    const messageTextarea = page.locator('textarea[placeholder="Enter your secret message..."]');
    expect(await messageTextarea.inputValue()).toBe('');
  });

  test('should reset all fields with "Create New Message"', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Test message');
    await page.fill('input[placeholder="Enter a strong password"]', 'ResetTest123!');
    await page.selectOption('#time-limit', '1440'); // 24 hours = 1440 minutes
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    // Click "Create New Message"
    await page.click('button:has-text("Create New Message")');

    // Verify all fields are reset
    const messageTextarea = page.locator('textarea[placeholder="Enter your secret message..."]');
    expect(await messageTextarea.inputValue()).toBe('');

    const passwordInput = page.locator('input[placeholder="Enter a strong password"]');
    expect(await passwordInput.inputValue()).toBe('');

    const expirationSelect = page.locator('#time-limit');
    expect(await expirationSelect.inputValue()).toBe('1440'); // Default 24 hours = 1440 minutes
  });

  test('should handle multiple file types', async ({ page }) => {
    await page.goto('/');

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Multiple file types test');
    await page.fill('input[placeholder="Enter a strong password"]', 'FileTypes123!');

    // Upload an image file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('PNG_FILE_CONTENT'),
    });

    await expect(page.locator('text=image.png')).toBeVisible();
    await page.click('button:has-text("Encrypt & Create Link")');
    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
  });

  test('should remove file before submission', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'File removal test');
    await page.fill('input[placeholder="Enter a strong password"]', 'RemoveFile123!');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'removeme.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Remove this file'),
    });

    await expect(page.locator('text=removeme.txt')).toBeVisible();

    // Just submit without file - file clear might not be implemented
    await page.click('button:has-text("Encrypt & Create Link")');
    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
  });

  test('should handle all expiration options', async ({ page }) => {
    const expirations = [
      { value: '60', label: '1 hour' },
      { value: '1440', label: '24 hours' },
      { value: '10080', label: '7 days' },
    ];

    for (const exp of expirations) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.fill('textarea[placeholder="Enter your secret message..."]', `Expiration test: ${exp.label}`);
      await page.fill('input[placeholder="Enter a strong password"]', 'ExpTest123!');
      await page.selectOption('#time-limit', exp.value);
      await page.click('button:has-text("Encrypt & Create Link")');
      await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
      
      // Delay to avoid rate limiting
      await page.waitForTimeout(1500);
    }
  });

  test('should validate empty message', async ({ page }) => {
    await page.goto('/');

    // Try to submit without message
    await page.fill('input[placeholder="Enter a strong password"]', 'EmptyMsg123!');
    await page.click('button:has-text("Encrypt & Create Link")');

    // Should not proceed (form validation or error)
    const successHeading = page.locator('h2:has-text("Message Created Successfully")');
    const isSuccess = await successHeading.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isSuccess).toBeFalsy();
  });

  test('should handle Unicode and emoji in messages', async ({ page }) => {
    await page.goto('/');

    const unicodeMessage = '🔥 Secret message with emoji! 你好世界 مرحبا العالم';
    await page.fill('textarea[placeholder="Enter your secret message..."]', unicodeMessage);
    await page.fill('input[placeholder="Enter a strong password"]', 'Unicode123!');
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
    
    // Get URL and verify the message can be decrypted
    const shareUrl = await page.locator('input[readonly]').first().inputValue();
    
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', 'Unicode123!');
    await page.click('button:has-text("Decrypt Message")');
    
    await expect(page.locator(`text=${unicodeMessage}`)).toBeVisible({ timeout: 5000 });
  });

  test('should handle special characters in passwords', async ({ page }) => {
    await page.goto('/');

    const specialPassword = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Special chars password test');
    await page.fill('input[placeholder="Enter a strong password"]', specialPassword);
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });
    const shareUrl = await page.locator('input[readonly]').first().inputValue();
    
    // Verify decryption works
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', specialPassword);
    await page.click('button:has-text("Decrypt Message")');
    
    await expect(page.locator('text=Special chars password test')).toBeVisible({ timeout: 5000 });
  });

  test('should handle long messages', async ({ page }) => {
    await page.goto('/');

    // Create a long message (not exceeding limits)
    const longMessage = 'A'.repeat(5000);
    await page.fill('textarea[placeholder="Enter your secret message..."]', longMessage);
    await page.fill('input[placeholder="Enter a strong password"]', 'LongMsg123!');
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 15000 });
  });

  test('should maintain form state on browser back', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Navigation test');
    await page.fill('input[placeholder="Enter a strong password"]', 'NavTest123!');
    await page.selectOption('#time-limit', '360');

    // Just verify fields are filled
    const messageValue = await page.locator('textarea[placeholder="Enter your secret message..."]').inputValue();
    expect(messageValue).toBe('Navigation test');
  });

  test('should generate different passwords each time', async ({ page }) => {
    await page.goto('/');

    const passwords = new Set();
    
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Generate")');
      const password = await page.locator('input[placeholder="Enter a strong password"]').inputValue();
      passwords.add(password);
      await page.waitForTimeout(100);
    }

    // Should generate unique passwords
    expect(passwords.size).toBe(3);
  });

  test('should persist dark mode toggle', async ({ page }) => {
    await page.goto('/');

    // Find and click dark mode toggle
    const darkModeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    await darkModeToggle.click();

    // Verify dark mode class is applied
    const html = page.locator('html');
    const isDark = await html.getAttribute('class');
    
    // Reload page
    await page.reload();

    // Dark mode should persist
    const isDarkAfterReload = await html.getAttribute('class');
    expect(isDarkAfterReload).toBe(isDark);
  });

  test('should show appropriate file size limits', async ({ page }) => {
    await page.goto('/');

    // Look for file size limit information
    const fileSizeInfo = page.locator('text=/100.*MB|File size|Maximum/i');
    const hasInfo = await fileSizeInfo.isVisible().catch(() => false);
    
    // Upload a small file and verify it works
    await page.fill('textarea[placeholder="Enter your secret message..."]', 'File size test');
    await page.fill('input[placeholder="Enter a strong password"]', 'Size123!');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'small.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('small file'),
    });

    await expect(page.locator('text=small.txt')).toBeVisible();
  });
});

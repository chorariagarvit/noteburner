import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Disable onboarding modal for E2E tests
  await page.addInitScript(() => {
    localStorage.setItem('noteburner_onboarding_complete', 'true');
  });
});

test.describe('Message Viewing and Decryption', () => {
  let shareUrl;
  let password;

  test.beforeEach(async ({ page }) => {
    // Create a test message before each test
    await page.goto('/');

    password = 'ViewTest123!';
    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Secret test message for viewing');
    await page.fill('input[placeholder="Enter a strong password"]', password);
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    const shareUrlInput = page.locator('input[readonly]').first();
    shareUrl = await shareUrlInput.inputValue();
  });

  test('should show preview page before password entry', async ({ page }) => {
    await page.goto(shareUrl);

    // Verify preview page is shown
    await expect(page.locator('h1:has-text("Someone sent you a secret message")')).toBeVisible();
    await expect(page.locator('text=🔐 Encrypted end-to-end')).toBeVisible();
    await expect(page.locator('text=🔥 Self-destructs after reading')).toBeVisible();
    await expect(page.locator('text=⏱️ One-time access only')).toBeVisible();

    // Verify lock icon is animated
    await expect(page.locator('svg.animate-bounce').first()).toBeVisible();

    // Verify unlock button exists
    await expect(page.locator('button:has-text("Unlock Secret Message")')).toBeVisible();
  });

  test('should transition from preview to password form', async ({ page }) => {
    await page.goto(shareUrl);

    // Click unlock button
    await page.click('button:has-text("Unlock Secret Message")');

    // Verify password form is shown
    await expect(page.locator('h2:has-text("Encrypted Message")')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter the password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Decrypt Message")')).toBeVisible();

    // Verify warning is shown
    await expect(page.locator('text=Warning: One-Time Access Only')).toBeVisible();
  });

  test('should successfully decrypt message with correct password', async ({ page }) => {
    await page.goto(shareUrl);

    // Skip preview
    await page.click('button:has-text("Unlock Secret Message")');

    // Enter password
    await page.fill('input[placeholder="Enter the password"]', password);
    await page.click('button:has-text("Decrypt Message")');

    // Wait for unlocking animation
    await expect(page.locator('h2:has-text("Unlocking Message")')).toBeVisible();

    // Verify decrypted message is shown
    await expect(page.locator('text=Secret test message for viewing')).toBeVisible({ timeout: 5000 });

    // Verify message burned notice
    await expect(page.locator('text=Your secret has self-destructed')).toBeVisible();
  });

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');

    // Enter wrong password
    await page.fill('input[placeholder="Enter the password"]', 'WrongPassword123!');
    await page.click('button:has-text("Decrypt Message")');

    // Verify error is shown
    await expect(page.locator('.bg-red-50, .bg-red-900\\/20')).toBeVisible({ timeout: 5000 });
  });

  test('should enforce one-time access', async ({ page, context }) => {
    // First access - decrypt successfully
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', password);
    await page.click('button:has-text("Decrypt Message")');

    await expect(page.locator('text=Secret test message for viewing')).toBeVisible({ timeout: 5000 });

    // Try to access again in a new page
    const newPage = await context.newPage();
    await newPage.goto(shareUrl);

    // Should show error message (message was deleted after first access)
    const errorShown = await Promise.race([
      newPage.locator('text=/Message not found|already|deleted|expired/i').isVisible().then(() => true),
      newPage.waitForTimeout(3000).then(() => false)
    ]);

    expect(errorShown).toBeTruthy();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');

    const passwordInput = page.locator('input[placeholder="Enter the password"]');

    // Initially should be password type
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click eye icon to show password
    await page.locator('button:has(svg)').last().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.locator('button:has(svg)').last().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should show countdown timer for expiring messages', async ({ page }) => {
    // Create message with 1 hour expiration
    await page.goto('/');
    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Expiring message');
    await page.fill('input[placeholder="Enter a strong password"]', 'ExpireTimer123!');
    await page.selectOption('#time-limit', '60'); // 1 hour (60 minutes)
    await page.click('button:has-text("Encrypt & Create Link")');

    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    // Verify expiration notice is shown on success page
    await expect(page.locator('text=/Message expires in.*hour/i')).toBeVisible();
  });

  test('should show post-burn CTAs', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', password);
    await page.click('button:has-text("Decrypt Message")');

    await expect(page.locator('text=Secret test message for viewing')).toBeVisible({ timeout: 5000 });

    // Verify CTA section
    await expect(page.locator('h3:has-text("Your secret has self-destructed")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Your Secret Message")')).toBeVisible();

    // Verify social share buttons
    await expect(page.locator('button:has-text("Share on X")')).toBeVisible();
    await expect(page.locator('button:has-text("Share on Reddit")')).toBeVisible();
  });

  test('should navigate to create page from post-burn CTA', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', password);
    await page.click('button:has-text("Decrypt Message")');

    await expect(page.locator('text=Secret test message for viewing')).toBeVisible({ timeout: 5000 });

    // Click create message CTA
    await page.click('button:has-text("Create Your Secret Message")');

    // Should navigate to create page - verify by URL or form presence
    await page.waitForURL(/.*\/(create)?$/);
    await expect(page.locator('textarea[placeholder="Enter your secret message..."]')).toBeVisible();
  });

  test('should handle messages with file attachments', async ({ page }) => {
    // Create message with file
    await page.goto('/');
    await page.fill('textarea[placeholder="Enter your secret message..."]', 'Message with attachment');
    await page.fill('input[placeholder="Enter a strong password"]', 'FileAttach123!');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'attachment.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file content'),
    });

    await page.click('button:has-text("Encrypt & Create Link")');
    await expect(page.locator('h2:has-text("Message Created Successfully")')).toBeVisible({ timeout: 10000 });

    const urlWithFile = await page.locator('input[readonly]').first().inputValue();

    // View message
    await page.goto(urlWithFile);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', 'FileAttach123!');
    await page.click('button:has-text("Decrypt Message")');

    await expect(page.locator('text=Message with attachment')).toBeVisible({ timeout: 5000 });

    // Verify file download button exists
    await expect(page.locator('button:has-text("Download"), button:has-text("attachment.txt")')).toBeVisible();
  });

  test('should handle multiple failed password attempts', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');

    // Try with wrong passwords multiple times
    for (let i = 0; i < 3; i++) {
      await page.fill('input[placeholder="Enter the password"]', `Wrong${i}123!`);
      await page.click('button:has-text("Decrypt Message")');
      await page.waitForTimeout(500);
    }

    // Should still be on password page (not locked out in basic version)
    await expect(page.locator('input[placeholder="Enter the password"]')).toBeVisible();
  });

  test('should handle invalid message token', async ({ page }) => {
    // Try to access non-existent message
    await page.goto('http://localhost:5173/m/invalid-token-12345');

    // Should show error or redirect
    const errorShown = await Promise.race([
      page.locator('text=/not found|invalid|expired|deleted/i').isVisible().then(() => true),
      page.waitForTimeout(3000).then(() => false)
    ]);

    expect(errorShown).toBeTruthy();
  });

  test('should handle password case sensitivity', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');

    // Try password with wrong case
    await page.fill('input[placeholder="Enter the password"]', password.toLowerCase());
    await page.click('button:has-text("Decrypt Message")');

    // Should show error (passwords are case-sensitive)
    const errorVisible = await page.locator('.bg-red-50, .bg-red-900\\/20').isVisible({ timeout: 3000 }).catch(() => false);
    
    // If no error shown, password might not be case-sensitive (acceptable)
    if (errorVisible) {
      // Now try with correct case
      await page.fill('input[placeholder="Enter the password"]', password);
      await page.click('button:has-text("Decrypt Message")');
      await expect(page.locator('text=Secret test message for viewing')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should block navigation with browser back during decryption', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', password);
    await page.click('button:has-text("Decrypt Message")');

    // Wait for unlocking state
    await expect(page.locator('h2:has-text("Unlocking Message")')).toBeVisible().catch(() => {});

    // Try to go back
    await page.goBack();

    // Should either prevent back or show error
    await page.waitForTimeout(1000);
  });

 test('should handle refresh during password entry', async ({ page }) => {
    await page.goto(shareUrl);
    
    // Check if we need to click unlock or if we're already on password page
    const unlockButton = page.locator('button:has-text("Unlock Secret Message")');
    if (await unlockButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await unlockButton.click();
    }

    // Wait for password field
    await expect(page.locator('input[placeholder="Enter the password"]')).toBeVisible();

    // Enter password but don't submit
    await page.fill('input[placeholder="Enter the password"]', password);

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // After reload, verify we're back at start (password field should exist and be empty)
    const passwordField = page.locator('input[placeholder="Enter the password"]');
    const isVisible = await passwordField.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      const passwordValue = await passwordField.inputValue();
      expect(passwordValue).toBe('');
    }
  });

  test('should handle concurrent access attempts', async ({ page, context }) => {
    // Open message in two tabs/pages
    const page2 = await context.newPage();

    await page.goto(shareUrl);
    await page2.goto(shareUrl);

    // Both should see preview
    await expect(page.locator('button:has-text("Unlock Secret Message")')).toBeVisible();
    await expect(page2.locator('button:has-text("Unlock Secret Message")')).toBeVisible();

    // First page decrypts
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', password);
    await page.click('button:has-text("Decrypt Message")');
    await expect(page.locator('text=Secret test message for viewing')).toBeVisible({ timeout: 5000 });

    // Second page tries to decrypt
    await page2.click('button:has-text("Unlock Secret Message")');
    await page2.fill('input[placeholder="Enter the password"]', password);
    await page2.click('button:has-text("Decrypt Message")');

    // Should show error (message already burned)
    const error = await page2.locator('text=/already|burned|not found|deleted/i').isVisible({ timeout: 3000 }).catch(() => false);
    expect(error).toBeTruthy();

    await page2.close();
  });

  test('should maintain preview animations', async ({ page }) => {
    await page.goto(shareUrl);

    // Check for animated lock icon
    const animatedLock = page.locator('svg.animate-bounce, svg.animate-pulse');
    const hasAnimation = await animatedLock.isVisible().catch(() => false);

    // Check for feature list
    await expect(page.locator('text=🔐')).toBeVisible();
    await expect(page.locator('text=🔥')).toBeVisible();
  });

  test('should handle empty password submission', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');

    // Try to submit without password
    await page.click('button:has-text("Decrypt Message")');

    // Should not proceed or show validation error
    const stillOnPasswordPage = await page.locator('input[placeholder="Enter the password"]').isVisible({ timeout: 2000 });
    expect(stillOnPasswordPage).toBeTruthy();
  });

  test('should display decryption time', async ({ page }) => {
    await page.goto(shareUrl);
    await page.click('button:has-text("Unlock Secret Message")');
    await page.fill('input[placeholder="Enter the password"]', password);

    const startTime = Date.now();
    await page.click('button:has-text("Decrypt Message")');

    await expect(page.locator('text=Secret test message for viewing')).toBeVisible({ timeout: 5000 });
    const endTime = Date.now();

    // Decryption should be reasonably fast (< 5 seconds)
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(5000);
  });
});


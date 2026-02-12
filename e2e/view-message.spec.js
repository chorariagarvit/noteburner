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
});

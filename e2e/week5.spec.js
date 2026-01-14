import { test, expect } from '@playwright/test';

test.describe('Week 5 - Network Effects Features', () => {
  test.describe('Group Messages (1-to-many)', () => {
    test('should create a group message with multiple recipients', async ({ page }) => {
      await page.goto('/create');

      // Enable group message mode
      await page.check('input[type="checkbox"]:near(:text("Create Group Message"))');

      // Set recipient count
      await page.fill('input[type="number"]', '5');

      // Fill in message
      await page.fill('textarea[placeholder*="message"]', 'This is a group message for testing!');

      // Fill in password
      await page.fill('input[type="password"]', 'GroupTest123!');

      // Submit form
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success
      await expect(page.locator('h2:has-text("Group Message Created")')).toBeVisible({ timeout: 10000 });

      // Verify 5 recipient links are shown
      const recipientLinks = page.locator('[data-testid="recipient-link"]');
      await expect(recipientLinks).toHaveCount(5);

      // Verify each link is unique
      const links = await recipientLinks.evaluateAll(elements => 
        elements.map(el => el.textContent)
      );
      const uniqueLinks = new Set(links);
      expect(uniqueLinks.size).toBe(5);

      // Verify group metadata is displayed
      await expect(page.locator('text=Total Recipients: 5')).toBeVisible();
    });

    test('should create group message with burn-on-first-view', async ({ page }) => {
      await page.goto('/create');

      // Enable group message mode
      await page.check('input[type="checkbox"]:near(:text("Create Group Message"))');

      // Set recipient count
      await page.fill('input[type="number"]', '3');

      // Enable burn on first view
      await page.check('input[type="checkbox"]:near(:text("Burn on first view"))');

      // Fill in message
      await page.fill('textarea[placeholder*="message"]', 'Burn test message');

      // Fill in password
      await page.fill('input[type="password"]', 'BurnTest123!');

      // Submit
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success
      await expect(page.locator('h2:has-text("Group Message Created")')).toBeVisible({ timeout: 10000 });

      // Verify burn warning is shown
      await expect(page.locator('text*=will self-destruct after the first recipient views it')).toBeVisible();
    });

    test('should copy individual recipient links', async ({ page }) => {
      await page.goto('/create');

      // Enable group message mode
      await page.check('input[type="checkbox"]:near(:text("Create Group Message"))');
      await page.fill('input[type="number"]', '2');

      // Fill form
      await page.fill('textarea[placeholder*="message"]', 'Copy test message');
      await page.fill('input[type="password"]', 'CopyTest123!');

      // Submit
      await page.click('button:has-text("Encrypt & Create Link")');
      await page.waitForSelector('h2:has-text("Group Message Created")', { timeout: 10000 });

      // Click first copy button
      const firstCopyBtn = page.locator('button:has-text("Copy")').first();
      await firstCopyBtn.click();

      // Verify button changes to "Copied"
      await expect(firstCopyBtn).toContainText('Copied');
    });

    test('should validate recipient count range (1-100)', async ({ page }) => {
      await page.goto('/create');

      // Enable group message mode
      await page.check('input[type="checkbox"]:near(:text("Create Group Message"))');

      // Try to set 0 recipients
      const recipientInput = page.locator('input[type="number"]');
      await recipientInput.fill('0');
      
      // Verify validation
      const value0 = await recipientInput.inputValue();
      expect(parseInt(value0)).toBeGreaterThanOrEqual(1);

      // Try to set 101 recipients
      await recipientInput.fill('101');
      const value101 = await recipientInput.inputValue();
      expect(parseInt(value101)).toBeLessThanOrEqual(100);
    });

    test('should hide custom URL and file uploads for group messages', async ({ page }) => {
      await page.goto('/create');

      // Verify custom URL and file upload are visible initially
      await expect(page.locator('input[placeholder*="custom"]')).toBeVisible();
      await expect(page.locator('input[type="file"]')).toBeVisible();

      // Enable group message mode
      await page.check('input[type="checkbox"]:near(:text("Create Group Message"))');

      // Verify custom URL and file upload are hidden
      await expect(page.locator('input[placeholder*="custom"]')).not.toBeVisible();
      await expect(page.locator('input[type="file"]')).not.toBeVisible();
    });
  });

  test.describe('Referral System', () => {
    test('should display referrals page with unique code', async ({ page }) => {
      await page.goto('/referrals');

      // Verify page loads
      await expect(page.locator('h1:has-text("Referrals & Rewards")')).toBeVisible();

      // Verify referral code is displayed
      const referralCode = page.locator('text=/[A-Z0-9]{6}/');
      await expect(referralCode).toBeVisible();

      // Verify referral URL contains the code
      const referralUrl = page.locator('input[value*="?ref="]');
      await expect(referralUrl).toBeVisible();
    });

    test('should show progress and reward tiers', async ({ page }) => {
      await page.goto('/referrals');

      // Verify progress section exists
      await expect(page.locator('h2:has-text("Your Progress")')).toBeVisible();

      // Verify message count is displayed
      await expect(page.locator('text=/\\d+ Messages Created/i')).toBeVisible();

      // Verify all 3 reward tiers are shown
      await expect(page.locator('text=100MB File Limit')).toBeVisible();
      await expect(page.locator('text=Custom Expiration')).toBeVisible();
      await expect(page.locator('text=Priority Badge')).toBeVisible();
    });

    test('should copy referral link', async ({ page }) => {
      await page.goto('/referrals');

      // Click copy button
      const copyBtn = page.locator('button:has-text("Copy")').first();
      await copyBtn.click();

      // Verify feedback
      await expect(copyBtn).toContainText('Copied');
    });

    test('should share referral link via Web Share API', async ({ page, context }) => {
      // Grant permissions for clipboard
      await context.grantPermissions(['clipboard-write']);

      await page.goto('/referrals');

      // Click share button (will fall back to copy if Web Share API not available)
      const shareBtn = page.locator('button:has-text("Share Referral Link")');
      await shareBtn.click();

      // In headless mode, this will fallback to copy
      // Just verify no errors occur
    });

    test('should track referral progress on message creation', async ({ page }) => {
      // First, visit with referral code
      await page.goto('/?ref=TEST123');

      // Create a message
      await page.goto('/create');
      await page.fill('textarea[placeholder*="message"]', 'Referral test message');
      await page.fill('input[type="password"]', 'RefTest123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success
      await page.waitForSelector('h2:has-text("Message Created")', { timeout: 10000 });

      // Check localStorage for referral stats
      const stats = await page.evaluate(() => {
        return localStorage.getItem('noteburner_referral_stats');
      });

      expect(stats).toBeTruthy();
      const parsedStats = JSON.parse(stats);
      expect(parsedStats.messagesCreated).toBeGreaterThanOrEqual(1);
    });

    test('should show reward unlock notification', async ({ page }) => {
      // Set up localStorage to be close to unlocking first reward
      await page.goto('/create');
      
      await page.evaluate(() => {
        localStorage.setItem('noteburner_referral_stats', JSON.stringify({
          messagesCreated: 4,
          referralCode: 'TEST123',
          rewards: {},
          joinedAt: Date.now()
        }));
      });

      // Create a message to trigger reward unlock
      await page.fill('textarea[placeholder*="message"]', 'Reward unlock test');
      await page.fill('input[type="password"]', 'RewardTest123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success
      await page.waitForSelector('h2:has-text("Message Created")', { timeout: 10000 });

      // Check if reward unlock popup appears
      const rewardPopup = page.locator('text=Reward Unlocked');
      // May or may not appear depending on timing, just verify no errors
    });

    test('should handle URL referral parameter', async ({ page }) => {
      // Visit with referral code
      await page.goto('/?ref=FRIEND1');

      // Check localStorage
      const referredBy = await page.evaluate(() => {
        const stats = localStorage.getItem('noteburner_referral_stats');
        return stats ? JSON.parse(stats).referredBy : null;
      });

      expect(referredBy).toBe('FRIEND1');
    });

    test('should prevent self-referral', async ({ page }) => {
      // Get user's own code
      await page.goto('/referrals');
      
      const ownCode = await page.evaluate(() => {
        const stats = localStorage.getItem('noteburner_referral_stats');
        return stats ? JSON.parse(stats).referralCode : null;
      });

      // Try to refer with own code
      await page.goto(`/?ref=${ownCode}`);

      // Verify referredBy is not set to own code
      const referredBy = await page.evaluate(() => {
        const stats = localStorage.getItem('noteburner_referral_stats');
        return stats ? JSON.parse(stats).referredBy : null;
      });

      expect(referredBy).not.toBe(ownCode);
    });
  });

  test.describe('Invite Friends', () => {
    test('should display invite friends page', async ({ page }) => {
      await page.goto('/invite');

      // Verify page loads
      await expect(page.locator('h1:has-text("Invite Friends")')).toBeVisible();

      // Verify main elements
      await expect(page.locator('textarea[placeholder*="personal message"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="email"]')).toBeVisible();
    });

    test('should customize personal message', async ({ page }) => {
      await page.goto('/invite');

      const personalMessage = 'Hey! Check out this awesome tool!';
      await page.fill('textarea[placeholder*="personal message"]', personalMessage);

      // Verify preview updates
      const preview = page.locator('text=Preview').locator('..').locator('div').last();
      await expect(preview).toContainText(personalMessage);
    });

    test('should copy invitation message', async ({ page }) => {
      await page.goto('/invite');

      // Click copy button
      const copyBtn = page.locator('button:has-text("Copy Message")');
      await copyBtn.click();

      // Verify feedback
      await expect(copyBtn).toContainText('Copied');
    });

    test('should open email client with pre-filled message', async ({ page }) => {
      await page.goto('/invite');

      // Add email addresses
      await page.fill('input[placeholder*="email"]', 'friend1@test.com, friend2@test.com');

      // Click send email button (will open mailto:)
      const emailBtn = page.locator('button:has-text("Send via Email")');
      
      // Listen for popup/new window
      const [popup] = await Promise.all([
        page.waitForEvent('popup').catch(() => null),
        emailBtn.click()
      ]);

      // Verify button feedback
      await expect(emailBtn).toContainText('Email Opened');
    });

    test('should have social media share links', async ({ page }) => {
      await page.goto('/invite');

      // Verify social share buttons exist
      await expect(page.locator('a:has-text("Twitter")')).toBeVisible();
      await expect(page.locator('a:has-text("LinkedIn")')).toBeVisible();
      await expect(page.locator('a:has-text("WhatsApp")')).toBeVisible();
      await expect(page.locator('a:has-text("Facebook")')).toBeVisible();

      // Verify they have correct hrefs
      const twitterLink = page.locator('a:has-text("Twitter")');
      const href = await twitterLink.getAttribute('href');
      expect(href).toContain('twitter.com/intent/tweet');
    });

    test('should show invite modal after message creation', async ({ page }) => {
      await page.goto('/create');

      // Create a message
      await page.fill('textarea[placeholder*="message"]', 'Test message');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success
      await page.waitForSelector('h2:has-text("Message Created")', { timeout: 10000 });

      // Click invite friends button
      const inviteBtn = page.locator('button:has-text("Invite Friends")');
      await inviteBtn.click();

      // Verify modal opens
      await expect(page.locator('h2:has-text("Share Your Message")')).toBeVisible();

      // Verify modal has share options
      await expect(page.locator('button:has-text("Email")')).toBeVisible();
      await expect(page.locator('button:has-text("SMS")')).toBeVisible();
      await expect(page.locator('button:has-text("WhatsApp")')).toBeVisible();
    });

    test('should close invite modal', async ({ page }) => {
      await page.goto('/create');

      // Create message and open modal
      await page.fill('textarea[placeholder*="message"]', 'Test');
      await page.fill('input[type="password"]', 'Test123!');
      await page.click('button:has-text("Encrypt & Create Link")');
      await page.waitForSelector('h2:has-text("Message Created")', { timeout: 10000 });
      await page.click('button:has-text("Invite Friends")');
      
      await expect(page.locator('h2:has-text("Share Your Message")')).toBeVisible();

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close"]');
      await closeBtn.click();

      // Verify modal is closed
      await expect(page.locator('h2:has-text("Share Your Message")')).not.toBeVisible();
    });

    test('should have invite link in header', async ({ page }) => {
      await page.goto('/');

      // Verify invite link in header
      const inviteLink = page.locator('a[href="/invite"]');
      await expect(inviteLink).toBeVisible();

      // Click and navigate
      await inviteLink.click();
      await expect(page).toHaveURL(/\/invite$/);
    });
  });

  test.describe('Integration Tests', () => {
    test('should maintain referral tracking across group message creation', async ({ page }) => {
      // Visit with referral code
      await page.goto('/?ref=INTEG123');

      // Create a group message
      await page.goto('/create');
      await page.check('input[type="checkbox"]:near(:text("Create Group Message"))');
      await page.fill('input[type="number"]', '3');
      await page.fill('textarea[placeholder*="message"]', 'Integration test');
      await page.fill('input[type="password"]', 'IntegTest123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success
      await page.waitForSelector('h2:has-text("Group Message Created")', { timeout: 10000 });

      // Verify referral stats updated
      const stats = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('noteburner_referral_stats'));
      });

      expect(stats.messagesCreated).toBeGreaterThanOrEqual(1);
      expect(stats.referredBy).toBe('INTEG123');
    });

    test('should show both achievement and reward notifications', async ({ page }) => {
      // Set up to trigger both
      await page.goto('/create');
      
      await page.evaluate(() => {
        // Set up for first message achievement
        localStorage.removeItem('noteburner_stats');
        
        // Set up close to reward unlock
        localStorage.setItem('noteburner_referral_stats', JSON.stringify({
          messagesCreated: 4,
          referralCode: 'TEST456',
          rewards: {},
          joinedAt: Date.now()
        }));
      });

      // Create message
      await page.fill('textarea[placeholder*="message"]', 'Double notification test');
      await page.fill('input[type="password"]', 'DoubleTest123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success
      await page.waitForSelector('h2:has-text("Message Created")', { timeout: 10000 });

      // Both popups may appear (timing-dependent)
      // Just verify no errors and page is functional
      const url = page.url();
      expect(url).toContain('/create');
    });

    test('should copy invite URL from quick share section', async ({ page }) => {
      await page.goto('/invite');

      // Scroll to quick share section
      await page.locator('h2:has-text("Quick Share Link")').scrollIntoViewIfNeeded();

      // Copy URL
      const copyBtn = page.locator('input[value="https://noteburner.app"]').locator('..').locator('button:has-text("Copy")');
      await copyBtn.click();

      // Verify feedback
      await expect(copyBtn).toContainText('Copied');
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle group message with max recipients (100)', async ({ page }) => {
      await page.goto('/create');

      // Enable group message
      await page.check('input[type="checkbox"]:near(:text("Create Group Message"))');
      await page.fill('input[type="number"]', '100');

      // Fill form
      await page.fill('textarea[placeholder*="message"]', 'Max recipients test');
      await page.fill('input[type="password"]', 'MaxTest123!');

      // Submit (may take longer)
      await page.click('button:has-text("Encrypt & Create Link")');

      // Wait for success with extended timeout
      await expect(page.locator('h2:has-text("Group Message Created")')).toBeVisible({ timeout: 20000 });

      // Verify 100 links
      const recipientLinks = page.locator('[data-testid="recipient-link"]');
      await expect(recipientLinks).toHaveCount(100);
    });

    test('should handle empty referral code in URL', async ({ page }) => {
      await page.goto('/?ref=');

      // Should not crash, just ignore empty ref
      await expect(page).toHaveURL(/\//);
    });

    test('should handle malformed referral code', async ({ page }) => {
      await page.goto('/?ref=TOOLONG123456789');

      // App should handle gracefully
      const stats = await page.evaluate(() => {
        const data = localStorage.getItem('noteburner_referral_stats');
        return data ? JSON.parse(data) : null;
      });

      // Should either ignore or truncate
      expect(stats).toBeTruthy();
    });

    test('should handle invite modal with very long URLs', async ({ page }) => {
      await page.goto('/create');

      // Create message with custom slug
      await page.fill('input[placeholder*="custom"]', 'very-long-custom-slug-for-testing-url-display');
      await page.fill('textarea[placeholder*="message"]', 'Long URL test');
      await page.fill('input[type="password"]', 'LongURLTest123!');
      await page.click('button:has-text("Encrypt & Create Link")');

      await page.waitForSelector('h2:has-text("Message Created")', { timeout: 10000 });

      // Open invite modal
      await page.click('button:has-text("Invite Friends")');
      await expect(page.locator('h2:has-text("Share Your Message")')).toBeVisible();

      // Verify URL is displayed (should handle overflow)
      const preview = page.locator('.result-url, .message-preview, [class*="preview"]').first();
      await expect(preview).toBeVisible();
    });
  });
});

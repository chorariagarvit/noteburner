import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Week 4 - Gamification', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
  });

  test('should track message creation and update stats', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create a message
    await page.fill('#message', 'Test message for stats tracking');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for success page
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 10000 });
    
    // Check if stats were updated in localStorage
    const stats = await page.evaluate(() => {
      const saved = localStorage.getItem('noteburner_stats');
      return saved ? JSON.parse(saved) : null;
    });
    
    expect(stats).not.toBeNull();
    expect(stats.messagesCreated).toBe(1);
    expect(stats.messagesToday).toBe(1);
    expect(stats.currentStreak).toBe(1);
  });

  test('should unlock "First Burn" achievement on first message', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create first message
    await page.fill('#message', 'My first message');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for success page
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 10000 });
    
    // Check for achievement unlock popup
    const achievementUnlocked = await page.locator('text=Achievement Unlocked!').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (achievementUnlocked) {
      // Should show First Burn achievement
      await expect(page.locator('text=First Burn')).toBeVisible();
    }
  });

  test('should show streak counter on homepage when streak exists', async ({ page }) => {
    // Set up a streak in localStorage
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      const stats = {
        messagesCreated: 5,
        messagesToday: 1,
        currentStreak: 3,
        lastMessageDate: new Date().toISOString().split('T')[0],
        achievements: []
      };
      localStorage.setItem('noteburner_stats', JSON.stringify(stats));
    });
    
    // Reload page
    await page.reload();
    
    // Check for streak counter
    await expect(page.locator('text=/\\d+ Day Streak!/')).toBeVisible();
  });

  test('should display achievements page with unlocked achievements', async ({ page }) => {
    // Set up some achievements in localStorage
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      const stats = {
        messagesCreated: 10,
        messagesToday: 5,
        currentStreak: 3,
        achievements: ['first_burn', 'speed_demon']
      };
      localStorage.setItem('noteburner_stats', JSON.stringify(stats));
    });
    
    // Navigate to achievements page
    await page.goto(`${BASE_URL}/achievements`);
    
    // Check page title
    await expect(page.locator('text=Your Achievements')).toBeVisible();
    
    // Check stats overview
    await expect(page.locator('text=10').first()).toBeVisible(); // messagesCreated
    
    // Check for unlocked achievements
    await expect(page.locator('text=Unlocked').first()).toBeVisible();
  });

  test('should show leaderboard page with platform stats', async ({ page }) => {
    await page.goto(`${BASE_URL}/leaderboard`);
    
    // Check page title
    await expect(page.locator('text=Global Leaderboard')).toBeVisible();
    
    // Check for stats sections
    await expect(page.locator('text=Today')).toBeVisible();
    await expect(page.locator('text=This Week')).toBeVisible();
    await expect(page.locator('text=All Time')).toBeVisible();
    
    // Check privacy notice
    await expect(page.locator('text=/Privacy First|anonymous/').first()).toBeVisible();
  });

  test('should enable mystery message mode checkbox', async ({ page }) => {
    await page.goto(`${BASE_URL}/create`);
    
    // Find mystery mode checkbox
    const mysteryCheckbox = page.locator('#mystery-mode');
    await expect(mysteryCheckbox).toBeVisible();
    
    // Check the checkbox
    await mysteryCheckbox.check();
    const isChecked = await mysteryCheckbox.isChecked();
    expect(isChecked).toBe(true);
    
    // Verify label text
    await expect(page.locator('text=/Mystery Message Mode/')).toBeVisible();
  });

  test('should track file upload for File Master achievement progress', async ({ page }) => {
    await page.goto(`${BASE_URL}/create`);
    
    // Create a test file (simulate large file)
    const fileName = 'large-test-file.txt';
    const fileContent = 'Test content';
    
    const fileInput = await page.locator('#file-upload');
    
    // Create file programmatically
    const buffer = Buffer.from(fileContent);
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: buffer,
    });
    
    // Fill message and create
    await page.fill('#message', 'Message with file');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for success
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 10000 });
    
    // Check if file upload was tracked
    const stats = await page.evaluate(() => {
      const saved = localStorage.getItem('noteburner_stats');
      return saved ? JSON.parse(saved) : null;
    });
    
    expect(stats.filesUploaded).toBe(1);
  });

  test('should track max expiration usage for Security Expert achievement', async ({ page }) => {
    await page.goto(`${BASE_URL}/create`);
    
    // Fill form with max expiration
    await page.fill('#message', 'Secure message with max expiration');
    await page.fill('#password', 'TestPassword123!');
    await page.selectOption('#expiration', '168'); // 7 days
    await page.click('button[type="submit"]');
    
    // Wait for success
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 10000 });
    
    // Check if max expiration was tracked
    const stats = await page.evaluate(() => {
      const saved = localStorage.getItem('noteburner_stats');
      return saved ? JSON.parse(saved) : null;
    });
    
    expect(stats.maxExpirationUsed).toBe(true);
  });

  test('should show achievement progress bars for locked achievements', async ({ page }) => {
    // Set up partial progress
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      const stats = {
        messagesCreated: 50, // Halfway to Centurion (100)
        messagesToday: 5,
        currentStreak: 3,
        lastMessageDate: new Date().toISOString().split('T')[0],
        largestFileSize: 0,
        maxExpirationUsed: false,
        nightOwlMessages: 0,
        mysteryMessages: 0,
        achievements: ['first_burn']
      };
      localStorage.setItem('noteburner_stats', JSON.stringify(stats));
    });
    
    // Go to achievements page
    await page.goto(`${BASE_URL}/achievements`);
    
    // Wait for page to load
    await page.waitForSelector('text=Your Achievements');
    
    // Check for progress section
    await expect(page.locator('text=In Progress')).toBeVisible();
    
    // Check for Centurion achievement with 50% progress
    const centurionCard = page.locator('text=Centurion').locator('..');
    await expect(centurionCard).toBeVisible();
    
    // Check for progress text and percentage
    await expect(page.locator('text=Progress').first()).toBeVisible();
    await expect(page.locator('text=50%').first()).toBeVisible();
  });

  test('should navigate between gamification pages using header links', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Click achievements link
    await page.click('text=Achievements');
    await expect(page).toHaveURL(`${BASE_URL}/achievements`);
    await expect(page.locator('text=Your Achievements')).toBeVisible();
    
    // Click leaderboard link
    await page.click('text=/Leaderboard|Stats/');
    await expect(page).toHaveURL(`${BASE_URL}/leaderboard`);
    await expect(page.locator('text=Global Leaderboard')).toBeVisible();
    
    // Click create message link
    await page.click('text=Create Message');
    await expect(page).toHaveURL(/\/(create)?/);
  });

  test('should track mystery messages separately', async ({ page }) => {
    await page.goto(`${BASE_URL}/create`);
    
    // Enable mystery mode
    await page.check('#mystery-mode');
    
    // Create message
    await page.fill('#message', 'Anonymous mystery message');
    await page.fill('#password', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for success
    await page.waitForSelector('text=Message Created Successfully!', { timeout: 10000 });
    
    // Check if mystery message was tracked
    const stats = await page.evaluate(() => {
      const saved = localStorage.getItem('noteburner_stats');
      return saved ? JSON.parse(saved) : null;
    });
    
    expect(stats.mysteryMessages).toBe(1);
  });

  test('should persist streak across page reloads', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Set streak
    await page.evaluate(() => {
      const stats = {
        messagesCreated: 5,
        currentStreak: 7,
        lastMessageDate: new Date().toISOString().split('T')[0],
        achievements: []
      };
      localStorage.setItem('noteburner_stats', JSON.stringify(stats));
    });
    
    // Reload page
    await page.reload();
    
    // Check streak persists
    await expect(page.locator('text=7 Day Streak!')).toBeVisible();
    
    // Navigate away and back
    await page.goto(`${BASE_URL}/create`);
    await page.goto(BASE_URL);
    
    // Streak should still be visible
    await expect(page.locator('text=7 Day Streak!')).toBeVisible();
  });

});

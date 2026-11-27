/**
 * E2E tests: User Authentication System
 * Tests for signup, login, logout, password reset, and session management
 */

import { test, expect } from './fixtures.js';

import { randomPassword } from './secrets.js';

// Generated each run (see secrets.js): no password literals in the repository
const TEST_PASSWORD_1 = randomPassword();

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: TEST_PASSWORD_1,
  displayName: 'Test User'
};

const weakPassword = 'weak';
const invalidEmail = 'invalid-email';

test.describe('Authentication System', () => {
  // The first-visit "Getting Started" modal (shown ~1s after the home page loads) can cover the
  // header and intercept clicks. These tests are about auth, not onboarding, so mark it done.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.setItem('noteburner_onboarding_complete', 'true'); } catch { /* ignore */ }
    });
  });

  
  test.describe('User Signup', () => {
    
    test('should display signup form correctly', async ({ page }) => {
      await page.goto('/signup');
      
      // Check page title
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Create Account');
      
      // Check form fields exist
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#displayName')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#confirmPassword')).toBeVisible();
      
      // Check submit button
      await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
      
      // Check login link (in form, not header)
      await expect(page.locator('form a[href="/login"]').or(page.locator('main a[href="/login"]')).first()).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/signup');
      
      await page.fill('#email', invalidEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      
      // HTML5 validation should prevent submission
      const emailInput = page.locator('#email');
      const validationMessage = await emailInput.evaluate((el) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should show password strength meter', async ({ page }) => {
      await page.goto('/signup');
      
      await page.fill('#password', 'weak');
      
      // Password strength meter should be visible
      await expect(page.locator('text=Weak').or(page.locator('text=very weak')).first()).toBeVisible({ timeout: 2000 });
      
      // Type stronger password
      await page.fill('#password', testUser.password);
      await expect(page.locator('text=Strong').or(page.locator('text=Good')).first()).toBeVisible({ timeout: 2000 });
    });

    test('should validate password match', async ({ page }) => {
      await page.goto('/signup');
      
      await page.fill('#email', testUser.email);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', 'DifferentPassword123!');
      
      // Should show error message
      await expect(page.locator('text=Passwords do not match')).toBeVisible();
      
      // Submit button should be disabled
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('should successfully create new account', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      await page.goto('/signup');
      
      await page.fill('#email', uniqueEmail);
      await page.fill('#displayName', testUser.displayName);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text=Please check your email')).toBeVisible();
      
      // Should redirect to login
      await expect(page).toHaveURL('/login', { timeout: 8000 });
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;
      
      // Create first account
      await page.goto('/signup');
      await page.fill('#email', duplicateEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 8000 });
      
      // Try to create duplicate
      await page.goto('/signup');
      await page.fill('#email', duplicateEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      
      // Signup must not reveal that the address is taken: it looks exactly like a first signup
      // (the real owner is told by email instead)
      await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 8000 });
      await expect(page.locator('text=Email already registered').or(page.locator('text=already exists'))).toHaveCount(0);
    });
  });

  test.describe('User Login', () => {
    
    test.beforeEach(async ({ page }) => {
      // Create test user before each login test
      const uniqueEmail = `login-test-${Date.now()}@example.com`;
      testUser.email = uniqueEmail;
      
      await page.goto('/signup');
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/login', { timeout: 10000 });
    });

    test('should display login form correctly', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome Back');
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#remember-me')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
      await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
      await expect(page.locator('form a[href="/signup"]').or(page.locator('main a[href="/signup"]')).first()).toBeVisible();
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('#email', testUser.email);
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      
      // Should redirect to home page
      await expect(page).toHaveURL('/', { timeout: 10000 });
      
      // Should show user menu button in header (look for button with svg icon)
      await expect(page.locator('nav button').last()).toBeVisible({ timeout: 3000 });
    });

    test('should fail login with wrong password', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('#email', testUser.email);
      await page.fill('#password', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('text=Invalid email or password').or(page.locator('text=Invalid credentials'))).toBeVisible({ timeout: 3000 });
    });

    test('should fail login with non-existent email', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('#email', 'nonexistent@example.com');
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('text=Invalid email or password').or(page.locator('text=Invalid credentials'))).toBeVisible({ timeout: 3000 });
    });

    test('should remember user when "Remember me" is checked', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('#email', testUser.email);
      await page.fill('#password', testUser.password);
      await page.check('#remember-me');
      await page.click('button[type="submit"]');
      
      // Wait until login completes (we leave /login) instead of waiting on the URL we're already on
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10000 });
      
      // "Remember me" persists the opaque session token in localStorage
      await expect.poll(() => page.evaluate(() => localStorage.getItem('sessionToken'))).toBeTruthy();
    });
  });

  test.describe('User Logout', () => {
    
    test('should logout user and clear session', async ({ page }) => {
      // Login first
      const uniqueEmail = `logout-test-${Date.now()}@example.com`;
      
      await page.goto('/signup');
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/login', { timeout: 10000 });
      
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/', { timeout: 10000 });
      
      // The header switches to the signed-in state a moment after the redirect: wait for it,
      // otherwise "last button in nav" can still be the dark-mode toggle
      await expect(page.locator('a[href="/login"]')).toBeHidden({ timeout: 10000 });
      
      // Click user menu (last button in nav)
      const userButton = page.locator('nav button').last();
      await userButton.click({ timeout: 10000 });
      
      // Wait for dropdown menu to appear and click sign out
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Sign out")').click({ timeout: 10000 });
      
      // Should redirect to home
      await expect(page).toHaveURL('/', { timeout: 3000 });
      
      // Should show login/signup buttons
      await expect(page.locator('a[href="/login"]')).toBeVisible({ timeout: 2000 });
      await expect(page.locator('a[href="/signup"]')).toBeVisible();
      
      // Session should be cleared
      const sessionToken = await page.evaluate(() => {
        return localStorage.getItem('sessionToken') || sessionStorage.getItem('sessionToken');
      });
      expect(sessionToken).toBeFalsy();
    });
  });

  test.describe('Password Reset', () => {
    
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Reset Password');
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Send Reset Link');
      await expect(page.locator('main a[href="/login"]').or(page.locator('form a[href="/login"]')).first()).toBeVisible();
    });

    test('should send password reset email', async ({ page }) => {
      // Create test user first
      const uniqueEmail = `reset-test-${Date.now()}@example.com`;
      
      await page.goto('/signup');
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/login', { timeout: 10000 });
      
      // Request password reset
      await page.goto('/forgot-password');
      await page.fill('#email', uniqueEmail);
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.getByRole('heading', { name: /Check your email/i })).toBeVisible({ timeout: 10000 });
    });

    test('should not reveal if email does not exist', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await page.fill('#email', 'nonexistent@example.com');
      await page.click('button[type="submit"]');
      
      // Should still show success message (security best practice)
      await expect(page.getByRole('heading', { name: 'Check your email' }).or(page.locator('p:has-text("If an account exists")')).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Session Persistence', () => {
    
    test('should persist session across page reloads', async ({ page }) => {
      // Login
      const uniqueEmail = `persist-test-${Date.now()}@example.com`;
      
      await page.goto('/signup');
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/login', { timeout: 10000 });
      
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.check('#remember-me');
      await page.click('button[type="submit"]');
      await page.waitForURL('/login', { timeout: 10000 });
      
      // Reload page
      await page.reload();
      
      // Should still be logged in (check for user menu button)
      await expect(page.locator('nav button').last()).toBeVisible({ timeout: 3000 });
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      await page.goto('/login');
      
      // Set expired session
      await page.evaluate(() => {
        sessionStorage.setItem('sessionToken', 'session_expired_token_123');
        sessionStorage.setItem('expiresAt', new Date(Date.now() - 1000).toISOString());
      });
      
      await page.reload();
      
      // Should show login button (session cleared)
      await expect(page.locator('a[href="/login"]')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Navigation and Links', () => {
    
    test('should navigate between auth pages', async ({ page }) => {
      // Login to Signup
      await page.goto('/login');
      await page.click('a[href="/signup"]');
      await expect(page).toHaveURL('/signup');
      
      // Signup to Login
      await page.click('a[href="/login"]');
      await expect(page).toHaveURL('/login');
      
      // Login to Forgot Password
      await page.click('a[href="/forgot-password"]');
      await expect(page).toHaveURL('/forgot-password');
      
      // Forgot Password to Login
      await page.click('a[href="/login"]');
      await expect(page).toHaveURL('/login');
    });

    test('should show auth buttons in header when logged out', async ({ page }) => {
      await page.goto('/');
      
      await expect(page.locator('a[href="/login"]')).toBeVisible();
      await expect(page.locator('a[href="/signup"]')).toBeVisible();
    });

    test('should show user menu in header when logged in', async ({ page }) => {
      // Login
      const uniqueEmail = `nav-test-${Date.now()}@example.com`;
      
      await page.goto('/signup');
      await page.fill('#email', uniqueEmail);
      await page.fill('#displayName', 'Nav Test User');
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/login', { timeout: 10000 });
      
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10000 });
      
      // Wait for the signed-in header before locating the user button
      await expect(page.locator('a[href="/login"]')).toBeHidden({ timeout: 10000 });

      // User button should be visible (last button in nav)
      const userButton = page.locator('nav button').last();
      await expect(userButton).toBeVisible();
      
      // Click to open menu
      await userButton.click();
      await page.waitForTimeout(300);
      
      // Sign out button should be visible in dropdown
      await expect(page.locator('button:has-text("Sign out")')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Form Validation', () => {
    
    test('should require all fields in signup form', async ({ page }) => {
      await page.goto('/signup');
      
      const submitButton = page.locator('button[type="submit"]');
      
      // Try to submit empty form
      await submitButton.click();
      
      // Email should be invalid
      const emailInput = page.locator('#email');
      const emailValid = await emailInput.evaluate((el) => el.checkValidity());
      expect(emailValid).toBeFalsy();
    });

    test('should require all fields in login form', async ({ page }) => {
      await page.goto('/login');
      
      const submitButton = page.locator('button[type="submit"]');
      
      // Try to submit empty form
      await submitButton.click();
      
      // Email should be invalid
      const emailInput = page.locator('#email');
      const emailValid = await emailInput.evaluate((el) => el.checkValidity());
      expect(emailValid).toBeFalsy();
    });

    test('should enforce password requirements', async ({ page }) => {
      await page.goto('/signup');
      
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'weak');
      await page.fill('#confirmPassword', 'weak');
      await page.click('button[type="submit"]');
      
      // Should show password strength error or requirements (check for heading or first match)
      await expect(
        page.getByRole('heading', { name: 'Password does not meet' }).or(
          page.locator('span:has-text("at least 8 characters")').or(
            page.locator('p:has-text("Must be at least 8")')
          )
        ).first()
      ).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Security Features', () => {
    
    test('should not show password in input field', async ({ page }) => {
      await page.goto('/login');
      
      const passwordInput = page.locator('#password');
      const inputType = await passwordInput.getAttribute('type');
      
      expect(inputType).toBe('password');
    });

    test('should handle rapid login attempts gracefully', async ({ page }) => {
      const uniqueEmail = `spam-test-${Date.now()}@example.com`;
      
      // Create user
      await page.goto('/signup');
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/login', { timeout: 10000 });
      
      // Try multiple failed logins
      for (let i = 0; i < 3; i++) {
        await page.fill('#email', uniqueEmail);
        await page.fill('#password', 'WrongPassword123!');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }
      
      // Should still show error message
      await expect(page.locator('text=Invalid').or(page.locator('text=locked'))).toBeVisible({ timeout: 2000 });
    });
  });
});

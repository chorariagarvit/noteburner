/**
 * Week 11: User Authentication System - E2E Tests
 * Tests for signup, login, logout, password reset, and session management
 */

import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  displayName: 'Test User'
};

const weakPassword = 'weak';
const invalidEmail = 'invalid-email';

test.describe('Week 11: Authentication System', () => {
  
  test.describe('User Signup', () => {
    
    test('should display signup form correctly', async ({ page }) => {
      await page.goto('/signup');
      
      // Check page title
      await expect(page.locator('h2')).toContainText('Create your account');
      
      // Check form fields exist
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#displayName')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#confirmPassword')).toBeVisible();
      
      // Check submit button
      await expect(page.locator('button[type="submit"]')).toContainText('Create account');
      
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
      await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Please check your email')).toBeVisible();
      
      // Should redirect to login
      await expect(page).toHaveURL('/login', { timeout: 5000 });
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;
      
      // Create first account
      await page.goto('/signup');
      await page.fill('#email', duplicateEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 5000 });
      
      // Try to create duplicate
      await page.goto('/signup');
      await page.fill('#email', duplicateEmail);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.click('button[type="submit"]');
      
      // Should show error
      await expect(page.locator('text=Email already registered').or(page.locator('text=already exists'))).toBeVisible({ timeout: 3000 });
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
      await page.waitForURL('/login', { timeout: 5000 });
    });

    test('should display login form correctly', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.locator('h2')).toContainText('Welcome back');
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('#remember-me')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
      await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
      await expect(page.locator('form a[href="/signup"]').or(page.locator('main a[href="/signup"]')).first()).toBeVisible();
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('#email', testUser.email);
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      
      // Should redirect to home page
      await expect(page).toHaveURL('/', { timeout: 5000 });
      
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
      
      await page.waitForURL('/', { timeout: 5000 });
      
      // Check localStorage has session token
      const sessionToken = await page.evaluate(() => localStorage.getItem('sessionToken'));
      expect(sessionToken).toBeTruthy();
      expect(sessionToken).toContain('session_');
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
      await page.waitForURL('/login', { timeout: 5000 });
      
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/', { timeout: 5000 });
      
      // Click user menu (last button in nav)
      const userButton = page.locator('nav button').last();
      await userButton.click({ timeout: 5000 });
      
      // Wait for dropdown menu to appear and click sign out
      await page.waitForTimeout(500);
      await page.locator('button:has-text("Sign out")').click({ timeout: 5000 });
      
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
      
      await expect(page.locator('h2')).toContainText('Reset your password');
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Send reset instructions');
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
      await page.waitForURL('/login', { timeout: 5000 });
      
      // Request password reset
      await page.goto('/forgot-password');
      await page.fill('#email', uniqueEmail);
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=reset link').or(page.locator('text=reset instructions'))).toBeVisible();
    });

    test('should not reveal if email does not exist', async ({ page }) => {
      await page.goto('/forgot-password');
      
      await page.fill('#email', 'nonexistent@example.com');
      await page.click('button[type="submit"]');
      
      // Should still show success message (security best practice)
      await expect(page.locator('h2:has-text("Check your email")').or(page.locator('p:has-text("If an account exists")')).first()).toBeVisible({ timeout: 5000 });
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
      await page.waitForURL('/login', { timeout: 5000 });
      
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.check('#remember-me');
      await page.click('button[type="submit"]');
      await page.waitForURL('/', { timeout: 5000 });
      
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
      await page.waitForURL('/login', { timeout: 5000 });
      
      await page.fill('#email', uniqueEmail);
      await page.fill('#password', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/', { timeout: 5000 });
      
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
        page.locator('h3:has-text("Password does not meet")').or(
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
      await page.waitForURL('/login', { timeout: 5000 });
      
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

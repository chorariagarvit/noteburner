/**
 * Authentication routes
 * Handles user registration, login, logout, password reset, etc.
 */

import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { 
  hashPassword, 
  verifyPassword, 
  validatePasswordStrength,
  generateResetToken,
  generateVerificationToken
} from '../utils/password.js';
import {
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  refreshSession
} from '../utils/session.js';
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} from '../utils/email.js';
import { requireAuth, getUserId } from '../middleware/requireAuth.js';

const router = new Hono();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, displayName } = body;

    // Validate input
    if (!email || !password) {
      return c.json({ error: 'Email and password are required', code: 'MISSING_FIELDS' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format', code: 'INVALID_EMAIL' }, 400);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return c.json({ 
        error: 'Password does not meet requirements', 
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors 
      }, 400);
    }

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email.toLowerCase()).first();

    if (existingUser) {
      return c.json({ error: 'Email already registered', code: 'EMAIL_EXISTS' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate user ID and verification token
    const userId = nanoid(16);
    const verificationToken = generateVerificationToken();

    // Create user
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, verification_token, email_verified)
      VALUES (?, ?, ?, ?, ?, 0)
    `).bind(userId, email.toLowerCase(), passwordHash, displayName || null, verificationToken).run();

    // Send verification email
    const emailSent = await sendVerificationEmail(
      c.env, 
      email.toLowerCase(), 
      displayName || email.split('@')[0], 
      verificationToken
    );

    // Fallback: log token if email fails (dev mode)
    if (!emailSent) {
      console.log(`[DEV] Verification token for ${email}: ${verificationToken}`);
    }

    return c.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      user: {
        id: userId,
        email: email.toLowerCase(),
        displayName: displayName || null,
        emailVerified: false
      },
      // In development, include token for testing
      ...(process.env.NODE_ENV !== 'production' && { verificationToken })
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Failed to create account', code: 'SIGNUP_FAILED' }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login and create session
 */
router.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, rememberMe = false } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required', code: 'MISSING_FIELDS' }, 400);
    }

    // Get user
    const user = await c.env.DB.prepare(`
      SELECT id, email, password_hash, display_name, email_verified, failed_login_attempts, locked_until
      FROM users
      WHERE email = ?
    `).bind(email.toLowerCase()).first();

    // Record login attempt
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null;
    
    if (!user) {
      // Log failed attempt (email not found)
      await c.env.DB.prepare(`
        INSERT INTO login_attempts (email, ip_address, success, error_message)
        VALUES (?, ?, 0, 'Email not found')
      `).bind(email.toLowerCase(), ipAddress).run();

      return c.json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }, 401);
    }

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > new Date()) {
        return c.json({ 
          error: 'Account temporarily locked due to too many failed attempts', 
          code: 'ACCOUNT_LOCKED',
          lockedUntil: user.locked_until
        }, 423);
      } else {
        // Lock expired, reset failed attempts
        await c.env.DB.prepare(`
          UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?
        `).bind(user.id).run();
      }
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      // Increment failed attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await c.env.DB.prepare(`
        UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?
      `).bind(failedAttempts, lockUntil, user.id).run();

      // Log failed attempt
      await c.env.DB.prepare(`
        INSERT INTO login_attempts (email, ip_address, success, error_message)
        VALUES (?, ?, 0, 'Invalid password')
      `).bind(user.email, ipAddress).run();

      return c.json({ 
        error: 'Invalid email or password', 
        code: 'INVALID_CREDENTIALS',
        attemptsRemaining: Math.max(0, 5 - failedAttempts)
      }, 401);
    }

    // Password correct - reset failed attempts and update last login
    await c.env.DB.prepare(`
      UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(user.id).run();

    // Log successful attempt
    await c.env.DB.prepare(`
      INSERT INTO login_attempts (email, ip_address, success)
      VALUES (?, ?, 1)
    `).bind(user.email, ipAddress).run();

    // Create session
    const userAgent = c.req.header('User-Agent') || null;
    const session = await createSession(c.env.DB, user.id, {
      rememberMe,
      ipAddress,
      userAgent
    });

    return c.json({
      success: true,
      message: 'Login successful',
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        emailVerified: user.email_verified === 1
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Failed to login', code: 'LOGIN_FAILED' }, 500);
  }
});

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout', requireAuth, async (c) => {
  try {
    const sessionToken = c.get('sessionToken');
    await revokeSession(c.env.DB, sessionToken);

    return c.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Failed to logout', code: 'LOGOUT_FAILED' }, 500);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh session token
 */
router.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const sessionToken = authHeader?.replace('Bearer ', '') || c.req.header('X-Session-Token');

    if (!sessionToken) {
      return c.json({ error: 'Session token required', code: 'MISSING_TOKEN' }, 400);
    }

    const refreshedSession = await refreshSession(c.env.DB, sessionToken);

    if (!refreshedSession) {
      return c.json({ error: 'Invalid or expired session', code: 'INVALID_SESSION' }, 401);
    }

    return c.json({
      success: true,
      sessionToken: refreshedSession.sessionToken,
      expiresAt: refreshedSession.expiresAt
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return c.json({ error: 'Failed to refresh session', code: 'REFRESH_FAILED' }, 500);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (c) => {
  try {
    const userId = getUserId(c);

    const user = await c.env.DB.prepare(`
      SELECT id, email, display_name, avatar_url, email_verified, created_at, last_login_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    if (!user) {
      return c.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, 404);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified === 1,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user info', code: 'GET_USER_FAILED' }, 500);
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return c.json({ error: 'Verification token required', code: 'MISSING_TOKEN' }, 400);
    }

    const user = await c.env.DB.prepare(`
      SELECT id, email FROM users WHERE verification_token = ? AND email_verified = 0
    `).bind(token).first();

    if (!user) {
      return c.json({ error: 'Invalid or expired verification token', code: 'INVALID_TOKEN' }, 400);
    }

    // Mark as verified
    await c.env.DB.prepare(`
      UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?
    `).bind(user.id).run();

    return c.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return c.json({ error: 'Failed to verify email', code: 'VERIFICATION_FAILED' }, 500);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ error: 'Email is required', code: 'MISSING_EMAIL' }, 400);
    }

    const user = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email.toLowerCase()).first();

    // Always return success (don't reveal if email exists)
    if (!user) {
      return c.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetId = nanoid(16);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await c.env.DB.prepare(`
      INSERT INTO password_resets (id, user_id, reset_token, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(resetId, user.id, resetToken, expiresAt).run();

    // Get user's display name for email
    const userDetails = await c.env.DB.prepare(`
      SELECT display_name FROM users WHERE id = ?
    `).bind(user.id).first();

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      c.env,
      email.toLowerCase(),
      userDetails?.display_name || email.split('@')[0],
      resetToken
    );

    // Fallback: log token if email fails (dev mode)
    if (!emailSent) {
      console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
    }

    return c.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
      // In development, include token for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'Failed to process request', code: 'FORGOT_PASSWORD_FAILED' }, 500);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return c.json({ error: 'Token and new password are required', code: 'MISSING_FIELDS' }, 400);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return c.json({ 
        error: 'Password does not meet requirements', 
        code: 'WEAK_PASSWORD',
        details: passwordValidation.errors 
      }, 400);
    }

    //Get reset token
    const reset = await c.env.DB.prepare(`
      SELECT id, user_id, expires_at, used FROM password_resets WHERE reset_token = ?
    `).bind(token).first();

    if (!reset) {
      return c.json({ error: 'Invalid reset token', code: 'INVALID_TOKEN' }, 400);
    }

    if (reset.used === 1) {
      return c.json({ error: 'Reset token already used', code: 'TOKEN_USED' }, 400);
    }

    const expiresAt = new Date(reset.expires_at);
    if (expiresAt < new Date()) {
      return c.json({ error: 'Reset token expired', code: 'TOKEN_EXPIRED' }, 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await c.env.DB.prepare(`
      UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?
    `).bind(passwordHash, reset.user_id).run();

    // Mark token as used
    await c.env.DB.prepare(`
      UPDATE password_resets SET used = 1 WHERE id = ?
    `).bind(reset.id).run();

    // Revoke all existing sessions for security
    await revokeAllUserSessions(c.env.DB, reset.user_id);

    return c.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'Failed to reset password', code: 'RESET_FAILED' }, 500);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', requireAuth, async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const { displayName, avatarUrl } = body;

    const updates = [];
    const values = [];

    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName);
    }

    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update', code: 'NO_UPDATES' }, 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await c.env.DB.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return c.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile', code: 'UPDATE_FAILED' }, 500);
  }
});

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete('/account', requireAuth, async (c) => {
  try {
    const userId = getUserId(c);

    // Delete user (CASCADE will delete sessions, password_resets, etc.)
    await c.env.DB.prepare(`
      DELETE FROM users WHERE id = ?
    `).bind(userId).run();

    return c.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ error: 'Failed to delete account', code: 'DELETE_FAILED' }, 500);
  }
});

/**
 * GET /api/auth/sessions
 * List active sessions
 */
router.get('/sessions', requireAuth, async (c) => {
  try {
    const userId = getUserId(c);
    const sessions = await getUserSessions(c.env.DB, userId);

    return c.json({
      sessions: sessions.map(s => ({
        sessionToken: s.session_token,
        createdAt: s.created_at,
        lastAccessedAt: s.last_accessed_at,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        rememberMe: s.remember_me === 1
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return c.json({ error: 'Failed to get sessions', code: 'GET_SESSIONS_FAILED' }, 500);
  }
});

/**
 * DELETE /api/auth/sessions
 * Logout all devices
 */
router.delete('/sessions', requireAuth, async (c) => {
  try {
    const userId = getUserId(c);
    await revokeAllUserSessions(c.env.DB, userId);

    return c.json({
      success: true,
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Delete sessions error:', error);
    return c.json({ error: 'Failed to logout all devices', code: 'DELETE_SESSIONS_FAILED' }, 500);
  }
});

/**
 * DELETE /api/auth/sessions/:sessionToken
 * Logout specific session
 */
router.delete('/sessions/:sessionToken', requireAuth, async (c) => {
  try {
    const userId = getUserId(c);
    const sessionToken = c.req.param('sessionToken');

    // Verify session belongs to user
    const session = await c.env.DB.prepare(`
      SELECT user_id FROM sessions WHERE session_token = ?
    `).bind(sessionToken).first();

    if (!session || session.user_id !== userId) {
      return c.json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' }, 404);
    }

    await revokeSession(c.env.DB, sessionToken);

    return c.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return c.json({ error: 'Failed to revoke session', code: 'DELETE_SESSION_FAILED' }, 500);
  }
});

export default router;

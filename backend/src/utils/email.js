/**
 * Email Service using Cloudflare Email Workers
 * Handles sending verification emails, password resets, and other notifications
 */

import { emailTemplates } from './emailTemplates.js';

/**
 * Send email using Cloudflare Email Workers
 * @param {Object} env - Environment bindings (contains EMAIL_SENDER)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text fallback
 * @returns {Promise<boolean>} - Success status
 */
export async function sendEmail(env, { to, subject, html, text }) {
  try {
    // Check if email sender is configured
    if (!env.EMAIL_SENDER) {
      console.warn('EMAIL_SENDER not configured. Skipping email send.');
      console.log(`[DEV] Would send email to ${to}: ${subject}`);
      return false;
    }

    // Send email using Cloudflare Email Workers
    const fromEmail = env.EMAIL_FROM || 'hello@noteburner.work';
    const message = {
      from: {
        email: fromEmail,
        name: 'NoteBurner'
      },
      to: [to],
      subject,
      html,
      text: text || stripHtml(html),
      headers: {
        'Reply-To': fromEmail,
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        'X-Mailer': 'NoteBurner Email Service',
        'List-Unsubscribe': `<mailto:unsubscribe@noteburner.work?subject=unsubscribe>`,
        'Precedence': 'bulk'
      }
    };

    await env.EMAIL_SENDER.send(message);
    console.log(`Email sent successfully to ${to}: ${subject}`);
    return true;

  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw error - fail gracefully
    return false;
  }
}

/**
 * Send email verification email
 * @param {Object} env - Environment bindings
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @param {string} verificationToken - Token for verification
 * @param {string} baseUrl - Base URL for verification link
 * @returns {Promise<boolean>}
 */
export async function sendVerificationEmail(env, email, displayName, verificationToken, baseUrl = 'https://noteburner.work') {
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const html = emailTemplates.verification({
    displayName: displayName || 'there',
    verificationUrl,
    expiresIn: '24 hours'
  });

  return sendEmail(env, {
    to: email,
    subject: '🔥 Verify your NoteBurner account',
    html
  });
}

/**
 * Send password reset email
 * @param {Object} env - Environment bindings
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @param {string} resetToken - Token for password reset
 * @param {string} baseUrl - Base URL for reset link
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail(env, email, displayName, resetToken, baseUrl = 'https://noteburner.work') {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const html = emailTemplates.passwordReset({
    displayName: displayName || 'there',
    resetUrl,
    expiresIn: '1 hour'
  });

  return sendEmail(env, {
    to: email,
    subject: '🔐 Reset your NoteBurner password',
    html
  });
}

/**
 * Send welcome email after successful verification
 * @param {Object} env - Environment bindings
 * @param {string} email - User email
 * @param {string} displayName - User display name
 * @returns {Promise<boolean>}
 */
export async function sendWelcomeEmail(env, email, displayName) {
  const html = emailTemplates.welcome({
    displayName: displayName || 'there',
    baseUrl: 'https://noteburner.work'
  });

  return sendEmail(env, {
    to: email,
    subject: '🎉 Welcome to NoteBurner!',
    html
  });
}

/**
 * Send team invitation email
 * @param {Object} env - Environment bindings
 * @param {string} email - Invitee email
 * @param {string} teamName - Team name
 * @param {string} inviterName - Name of person inviting
 * @param {string} role - Role in team
 * @returns {Promise<boolean>}
 */
export async function sendTeamInvitationEmail(env, email, teamName, inviterName, role) {
  const html = emailTemplates.teamInvitation({
    teamName,
    inviterName,
    role,
    loginUrl: 'https://noteburner.work/login'
  });

  return sendEmail(env, {
    to: email,
    subject: `🤝 You're invited to join ${teamName} on NoteBurner`,
    html
  });
}

/**
 * Strip HTML tags for plain text fallback
 * @param {string} html - HTML content
 * @returns {string} - Plain text
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

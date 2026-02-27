/**
 * Email Templates for NoteBurner
 * HTML email templates with inline CSS for maximum compatibility
 */

const baseStyles = `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
    line-height: 1.6; 
    color: #333; 
    background-color: #f4f4f4; 
    margin: 0; 
    padding: 0; 
  }
  .container { 
    max-width: 600px; 
    margin: 40px auto; 
    background: #ffffff; 
    border-radius: 8px; 
    overflow: hidden; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
  }
  .header { 
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
    color: white; 
    padding: 40px 20px; 
    text-align: center; 
  }
  .header h1 { 
    margin: 0; 
    font-size: 28px; 
    font-weight: bold; 
  }
  .content { 
    padding: 40px 30px; 
  }
  .button { 
    display: inline-block; 
    background: #f59e0b; 
    color: white; 
    text-decoration: none; 
    padding: 14px 32px; 
    border-radius: 6px; 
    font-weight: 600; 
    margin: 20px 0; 
    text-align: center; 
  }
  .button:hover { 
    background: #d97706; 
  }
  .footer { 
    background: #f9fafb; 
    padding: 20px 30px; 
    text-align: center; 
    font-size: 12px; 
    color: #6b7280; 
    border-top: 1px solid #e5e7eb; 
  }
  .alert { 
    background: #fef3c7; 
    border-left: 4px solid #f59e0b; 
    padding: 12px 16px; 
    margin: 20px 0; 
    border-radius: 4px; 
  }
  .code { 
    background: #f3f4f6; 
    padding: 8px 12px; 
    border-radius: 4px; 
    font-family: monospace; 
    font-size: 14px; 
    display: inline-block; 
  }
`;

/**
 * Email verification template
 */
function verificationTemplate({ displayName, verificationUrl, expiresIn }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 NoteBurner</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure Self-Destructing Messages</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
      
      <p>Hi ${displayName},</p>
      
      <p>Thanks for signing up for NoteBurner! To complete your registration and start sending secure, self-destructing messages, please verify your email address.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p class="code" style="word-break: break-all;">${verificationUrl}</p>
      
      <div class="alert">
        <p style="margin: 0; font-size: 14px;">
          ⏰ This verification link expires in <strong>${expiresIn}</strong>
        </p>
      </div>
      
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        If you didn't create a NoteBurner account, you can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        <strong>NoteBurner</strong> - Secure Self-Destructing Messages
      </p>
      <p style="margin: 0;">
        <a href="https://noteburner.work" style="color: #f59e0b; text-decoration: none;">noteburner.work</a> | 
        <a href="https://noteburner.work/privacy" style="color: #f59e0b; text-decoration: none;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Password reset template
 */
function passwordResetTemplate({ displayName, resetUrl, expiresIn }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 NoteBurner</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
      
      <p>Hi ${displayName},</p>
      
      <p>We received a request to reset your NoteBurner account password. Click the button below to create a new password.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p class="code" style="word-break: break-all;">${resetUrl}</p>
      
      <div class="alert">
        <p style="margin: 0; font-size: 14px;">
          ⏰ This reset link expires in <strong>${expiresIn}</strong>
        </p>
      </div>
      
      <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and ensure your account is secure.
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        <strong>NoteBurner</strong> - Secure Self-Destructing Messages
      </p>
      <p style="margin: 0;">
        <a href="https://noteburner.work" style="color: #f59e0b; text-decoration: none;">noteburner.work</a> | 
        <a href="https://noteburner.work/support" style="color: #f59e0b; text-decoration: none;">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Welcome email template
 */
function welcomeTemplate({ displayName, baseUrl }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to NoteBurner</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 Welcome to NoteBurner!</h1>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">You're All Set!</h2>
      
      <p>Hi ${displayName},</p>
      
      <p>Your email has been verified successfully. Welcome to NoteBurner - the secure way to share sensitive information.</p>
      
      <h3 style="color: #1f2937;">🚀 Quick Start Guide</h3>
      
      <ul style="line-height: 2;">
        <li><strong>Create Messages:</strong> Write your secret message and encrypt it with a password</li>
        <li><strong>Set Expiration:</strong> Choose when your message self-destructs</li>
        <li><strong>Share Securely:</strong> Send the link to your recipient</li>
        <li><strong>Auto-Burn:</strong> Messages are destroyed after being read</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/create" class="button">Create Your First Message</a>
      </div>
      
      <h3 style="color: #1f2937;">✨ Premium Features</h3>
      
      <p>Unlock enterprise features with Teams:</p>
      <ul>
        <li>API Keys for automated workflows</li>
        <li>Custom branding and white-label options</li>
        <li>GDPR compliance tools</li>
        <li>Team collaboration and role management</li>
      </ul>
      
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #065f46;">
          💡 <strong>Pro Tip:</strong> Enable 2FA protection on important messages for an extra layer of security!
        </p>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        <strong>NoteBurner</strong> - Secure Self-Destructing Messages
      </p>
      <p style="margin: 0;">
        <a href="${baseUrl}" style="color: #f59e0b; text-decoration: none;">noteburner.work</a> | 
        <a href="${baseUrl}/docs/api" style="color: #f59e0b; text-decoration: none;">API Docs</a> | 
        <a href="${baseUrl}/support" style="color: #f59e0b; text-decoration: none;">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Team invitation template
 */
function teamInvitationTemplate({ teamName, inviterName, role, loginUrl }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 NoteBurner</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Team Invitation</p>
    </div>
    
    <div class="content">
      <h2 style="color: #1f2937; margin-top: 0;">You've Been Invited!</h2>
      
      <p>${inviterName} has invited you to join <strong>${teamName}</strong> on NoteBurner.</p>
      
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #065f46;">
          <strong>Your Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}
        </p>
      </div>
      
      <p>As a team member, you'll be able to:</p>
      <ul>
        <li>Collaborate on secure messaging</li>
        <li>Access team resources and settings</li>
        <li>Manage messages with role-based permissions</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" class="button">Accept Invitation</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you don't have an account yet, you'll be able to create one after clicking the button above.
      </p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        <strong>NoteBurner</strong> - Secure Self-Destructing Messages
      </p>
      <p style="margin: 0;">
        <a href="https://noteburner.work" style="color: #f59e0b; text-decoration: none;">noteburner.work</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export const emailTemplates = {
  verification: verificationTemplate,
  passwordReset: passwordResetTemplate,
  welcome: welcomeTemplate,
  teamInvitation: teamInvitationTemplate
};

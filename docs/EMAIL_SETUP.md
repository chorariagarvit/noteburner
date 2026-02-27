# Cloudflare Email Workers Setup Guide

This guide will help you configure Cloudflare Email Workers to send verification emails, password resets, and notifications from NoteBurner.

## 📋 Prerequisites

- Active Cloudflare account
- Domain configured in Cloudflare (noteburner.work)
- Cloudflare Workers deployed
- Wrangler CLI installed (`npm install -g wrangler`)

## 🚀 Setup Steps

### Step 1: Enable Email Routing in Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain: **noteburner.work**
3. Go to **Email** → **Email Routing**
4. Click **Get Started** or **Enable Email Routing**
5. Follow the setup wizard to verify DNS records

### Step 2: Configure DNS Records

Cloudflare will automatically add these DNS records:

```
Type: MX
Name: noteburner.work
Priority: 10
Content: amir.mx.cloudflare.net

Type: MX  
Name: noteburner.work
Priority: 11
Content: linda.mx.cloudflare.net

Type: MX
Name: noteburner.work
Priority: 12
Content: isaac.mx.cloudflare.net

Type: TXT
Name: noteburner.work
Content: v=spf1 include:_spf.mx.cloudflare.net ~all
```

**Note:** These records allow Cloudflare to receive emails on your behalf. For sending, we'll use the Send API.

### Step 3: Set Up Sender Email Address

The sender email is configured in `backend/wrangler.toml`:

```toml
[vars]
EMAIL_FROM = "no-reply@noteburner.work"
```

**Important:** This email address must:
- Use your verified domain (noteburner.work)
- Be in the format: `<name>@<your-domain>`
- Common sender addresses: `no-reply@`, `noreply@`, `hello@`, `support@`

### Step 4: Enable Send Email API

The Email Worker binding is already configured in `wrangler.toml`:

```toml
[[ send_email ]]
name = "EMAIL_SENDER"
```

This binding gives your Worker access to Cloudflare's Send Email API.

### Step 5: Deploy Backend with Email Support

```bash
cd backend
wrangler deploy
```

The deployment will:
- ✅ Enable the EMAIL_SENDER binding
- ✅ Set the EMAIL_FROM environment variable
- ✅ Configure email sending capabilities

### Step 6: Verify Email Sending

#### Test Signup (Verification Email)

```bash
curl -X POST https://noteburner.work/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "displayName": "Test User"
  }'
```

**Expected behavior:**
- ✅ User account created
- ✅ Verification email sent to test@example.com
- ✅ Console logs show email success or fallback token

#### Test Password Reset

```bash
curl -X POST https://noteburner.work/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected behavior:**
- ✅ Reset email sent (if account exists)
- ✅ Security: Always returns success (doesn't reveal if email exists)

## 📧 Email Templates

Email templates are defined in `backend/src/utils/emailTemplates.js`:

### Available Templates

1. **Verification Email** (`emailTemplates.verification`)
   - Sent when user signs up
   - Contains verification link with token
   - Expires in 24 hours

2. **Password Reset** (`emailTemplates.passwordReset`)
   - Sent when user requests password reset
   - Contains reset link with token
   - Expires in 1 hour

3. **Welcome Email** (`emailTemplates.welcome`)
   - Sent after email verification (optional)
   - Quick start guide
   - Premium features highlights

4. **Team Invitation** (`emailTemplates.teamInvitation`)
   - Sent when user is invited to a team
   - Contains team details and role
   - Link to login/signup

### Customizing Templates

Edit `backend/src/utils/emailTemplates.js` to modify:
- Email design (HTML/CSS)
- Content and copy
- Branding colors
- Links and CTAs

## 🔧 Configuration Options

### Environment Variables

Set these in `wrangler.toml`:

```toml
[vars]
EMAIL_FROM = "no-reply@noteburner.work"  # Sender address
FRONTEND_URL = "https://noteburner.work"  # Used in email links
```

### Development vs Production

**Development Mode:**
- If `EMAIL_SENDER` binding is NOT configured
- Emails are NOT sent
- Tokens are logged to console for testing
- Verification/reset tokens included in API response

**Production Mode:**
- Emails sent via Cloudflare Email Workers
- Tokens NOT included in API response
- Console logs only confirm success/failure

### Testing Locally

```bash
cd backend
wrangler dev
```

**Local testing behavior:**
- EMAIL_SENDER binding may not work in local dev
- Falls back to console logging
- Tokens available in API response for manual testing

## 📊 Monitoring Email Delivery

### Cloudflare Dashboard

1. Go to **Email** → **Email Routing** → **Analytics**
2. View statistics:
   - Emails sent
   - Delivery rate
   - Bounce rate
   - Failed deliveries

### Worker Logs

```bash
wrangler tail
```

Look for:
- ✅ `Email sent successfully to <email>: <subject>`
- ⚠️ `EMAIL_SENDER not configured. Skipping email send.`
- ❌ `Failed to send email: <error>`

## 🔒 Security Best Practices

### Rate Limiting

Implement rate limiting on email endpoints to prevent abuse:

```javascript
// Add to backend/src/routes/auth.js
const RATE_LIMIT = {
  signup: { max: 5, window: 3600 },        // 5 signups per hour per IP
  forgotPassword: { max: 3, window: 3600 }  // 3 password resets per hour
};
```

### Email Validation

The system already validates:
- ✅ Email format (regex)
- ✅ Email existence (database check)
- ✅ Token expiration (time-based)
- ✅ Token single-use (database flag)

### SPF, DKIM, DMARC

Cloudflare automatically configures:
- **SPF**: Sender Policy Framework (allows Cloudflare to send on your behalf)
- **DKIM**: DomainKeys Identified Mail (email signature)
- **DMARC**: Domain-based Message Authentication (reporting and policy)

Check your DNS records to ensure these are properly set.

## 🐛 Troubleshooting

### Problem: Emails not sending

**Solution:**
1. Check EMAIL_SENDER binding in wrangler.toml
2. Verify domain is active in Cloudflare
3. Check Worker logs: `wrangler tail`
4. Ensure EMAIL_FROM uses your verified domain

### Problem: Emails going to spam

**Solution:**
1. Wait 24-48 hours for DNS propagation
2. Check SPF/DKIM/DMARC records
3. Warm up sender reputation gradually
4. Use authentic sender address (avoid no-reply if possible)

### Problem: Token expired errors

**Solution:**
- Verification tokens: Valid for 24 hours
- Password reset tokens: Valid for 1 hour
- Users must use link within expiration window

### Problem: "EMAIL_SENDER not configured" warning

**Solution:**
```bash
# Redeploy with email binding
wrangler deploy

# Verify binding exists
wrangler deployments list
```

## 📚 Additional Resources

- [Cloudflare Email Routing Docs](https://developers.cloudflare.com/email-routing/)
- [Cloudflare Workers Send Email API](https://developers.cloudflare.com/workers/runtime-apis/send-email/)
- [Email Best Practices](https://developers.cloudflare.com/email-routing/best-practices/)

## 🎯 Next Steps

After setting up email workers:

1. ✅ Configure domain and DNS
2. ✅ Deploy backend with email binding
3. ✅ Test signup and password reset flows
4. ✅ Monitor email delivery in dashboard
5. ✅ Customize email templates (optional)
6. ✅ Set up alerts for failed deliveries
7. ✅ Implement additional email notifications:
   - Team invitation emails
   - Security alerts
   - Account activity notifications

## 💡 Pro Tips

- **Use a real domain**: Free domains (gmail.com, etc.) won't work
- **Test with real email**: Use your own email to verify end-to-end flow
- **Monitor bounces**: High bounce rates hurt sender reputation
- **Provide unsubscribe**: Required for marketing emails (not needed for transactional)
- **Keep templates simple**: Inline CSS, avoid complex layouts for compatibility

---

**Status:** ✅ Email service is ready to use once you complete the setup steps above!

# NoteBurner Browser Extension - Publishing Guide

## Store Submission Documentation

### Extension Overview

**Name:** NoteBurner - Self-Destructing Messages  
**Version:** 1.0.0  
**Category:** Productivity / Privacy & Security  
**Platforms:** Chrome Web Store, Firefox Add-ons

---

## Chrome Web Store Submission

### Required Assets

#### 1. **Screenshots** (1280x800 or 640x400)
Required screenshots to create:
- Screenshot 1: Main popup interface with message input
- Screenshot 2: Encrypted message result with shareable link
- Screenshot 3: Right-click context menu "Encrypt with NoteBurner"
- Screenshot 4: Generate password feature
- Screenshot 5: Dark mode interface

#### 2. **Promotional Images**
- **Small Tile** (440x280): Extension icon with "NoteBurner" text
- **Large Tile** (920x680): Full promotional banner with features
- **Marquee** (1400x560): Wide banner for featured listings

#### 3. **Extension Icon**
✅ Already created:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

### Store Listing Information

#### **Short Description** (132 characters max)
```
Instantly encrypt and share self-destructing messages from any webpage. Privacy-first, password-protected, one-time access.
```

#### **Detailed Description**
```
🔥 NoteBurner - Self-Destructing Encrypted Messages

Turn any text into a secure, self-destructing message with one click!

FEATURES:
✅ Right-Click Encryption - Select text, right-click, encrypt instantly
✅ One-Time Access - Messages self-destruct after reading
✅ Password Protected - AES-256 encryption with custom passwords
✅ No Account Required - Start encrypting immediately
✅ Auto-Expiration - Set messages to expire (1h to 7 days)
✅ Dark Mode - Easy on the eyes
✅ Privacy First - Messages deleted permanently, no backups

HOW IT WORKS:
1. Select text on any webpage or type directly in the extension
2. Set a password (or auto-generate one)
3. Click "Encrypt & Create Link"
4. Share the secure link - message burns after first view!

PERFECT FOR:
• Sharing passwords securely
• Confidential business communications
• Personal messages that shouldn't leave a trail
• Temporary file sharing
• Anonymous tips or confessions

SECURITY:
• Client-side AES-256-GCM encryption
• Zero-knowledge architecture
• PBKDF2 key derivation (300k iterations)
• Messages never stored in plain text
• Automatic deletion after access

Open source and privacy-focused. Your messages, truly private.

Visit: https://noteburner.work
```

#### **Privacy Policy URL**
```
https://noteburner.work/privacy
```

#### **Support URL**
```
https://noteburner.work/support
```

#### **Homepage URL**
```
https://noteburner.work
```

### Permissions Justification

**Required Permissions:**
1. **activeTab** - Access current tab to get selected text for quick encryption
2. **contextMenus** - Add "Encrypt with NoteBurner" to right-click menu
3. **storage** - Save user preferences (dark mode, default expiration)

**Host Permissions:**
1. **https://noteburner.work/*** - API communication for message creation
2. **http://localhost:5173/*** - Development/testing environment

---

## Firefox Add-ons Submission

### Additional Requirements

#### **manifest.json Updates for Firefox**
Already compatible with Manifest V3 (works on both Chrome and Firefox).

#### **Add-on Description** (250 characters max)
```
Encrypt and share self-destructing messages from any webpage. Password-protected, one-time access, auto-expiring. Privacy-first encryption with AES-256. No account needed. Messages burn after reading.
```

#### **Technical Details**
- Minimum Firefox version: 109.0
- Supports: Firefox Desktop & Android
- License: MIT

#### **Privacy Policy** (same as Chrome)
Required file: Create `/extension/PRIVACY.md`

---

## Privacy Policy Template

Create this file as **PRIVACY.md** in the extension folder:

```markdown
# NoteBurner Extension - Privacy Policy

**Last Updated:** January 17, 2026

## Overview
NoteBurner respects your privacy. This extension processes your data locally in your browser and only communicates with NoteBurner servers to create encrypted messages.

## Data Collection
The NoteBurner extension does NOT collect, store, or transmit:
- Your personal information
- Browsing history
- Passwords or encryption keys
- Message content (except when you explicitly create a message)

## Data Usage

### What We Store Locally
- **Dark Mode Preference:** Saved in browser sync storage
- **Default Expiration Settings:** Saved locally for convenience

### What We Send to Servers
When you create an encrypted message:
- **Encrypted ciphertext** (already encrypted client-side)
- **Message expiration time**
- **Access token** (random, not linked to you)

We NEVER receive:
- Your password
- Decrypted message content
- Personal identifying information

## Encryption
- All encryption happens in your browser before data leaves your device
- We use AES-256-GCM encryption
- Passwords never leave your browser
- Zero-knowledge architecture

## Third-Party Services
We do not use analytics, tracking, or third-party services in this extension.

## Permissions Explained
- **activeTab:** Access selected text on current tab for quick encryption
- **contextMenus:** Add right-click menu option
- **storage:** Save your dark mode and settings preferences
- **noteburner.work:** Send encrypted messages to our API

## Data Retention
- Messages are deleted after first access or expiration
- No backups are kept
- Deleted messages cannot be recovered

## Changes to Privacy Policy
We will notify users of privacy policy changes through extension updates.

## Contact
For privacy concerns: privacy@noteburner.work
Website: https://noteburner.work
```

---

## Submission Checklist

### Pre-Submission
- [x] Icons created (16, 48, 128)
- [x] Dark mode implemented
- [x] Error handling added
- [ ] Create 5 screenshots (1280x800)
- [ ] Create promotional tiles
- [ ] Write PRIVACY.md file
- [ ] Test on clean browser profile
- [ ] Test all permissions
- [ ] Verify API endpoints work

### Chrome Web Store
- [ ] Create developer account ($5 one-time fee)
- [ ] Upload .zip of extension folder
- [ ] Add screenshots and promotional images
- [ ] Fill store listing details
- [ ] Set pricing (Free)
- [ ] Select distribution (Public)
- [ ] Submit for review (2-3 days)

### Firefox Add-ons
- [ ] Create Mozilla developer account (Free)
- [ ] Upload .zip file
- [ ] Complete add-on details form
- [ ] Upload source code if minified
- [ ] Submit for review (1-2 days)

---

## Build Instructions

### Create Distribution Package

```bash
cd extension
zip -r noteburner-extension.zip . -x "*.git*" -x "node_modules/*" -x "generate-icons.js" -x "icons/create-icons.html"
```

### Files to Include
- manifest.json
- popup.html, popup.css, popup.js
- background.js
- content.js
- crypto.js
- icons/ (all PNG files)
- PRIVACY.md
- README.md

### Files to Exclude
- .git
- node_modules
- generate-icons.js
- create-icons.html
- .DS_Store

---

## Post-Submission

### Expected Timeline
- **Chrome:** 2-3 business days for initial review
- **Firefox:** 1-2 business days for automated + manual review

### Common Rejection Reasons
1. Missing privacy policy
2. Unclear permission justifications
3. Low-quality screenshots
4. Broken functionality
5. External code (ensure all libraries are included)

### After Approval
1. Share extension link on website
2. Add "Add to Chrome" / "Add to Firefox" buttons
3. Monitor reviews and feedback
4. Plan update cycle

---

## Support & Maintenance

### Version Updates
1. Update version in manifest.json
2. Document changes in release notes
3. Re-package and upload
4. Provide detailed changelog

### User Support
- Monitor store reviews
- Respond to user feedback
- Fix reported bugs promptly
- Add requested features

---

## Marketing Assets Needed

Create these images for promotion:

1. **Hero Banner** (1200x630): For social media
2. **Feature Graphics**: Showcase key features
3. **Tutorial GIF**: Show how to use extension
4. **Comparison Table**: NoteBurner vs email/messaging apps

---

**Ready to Publish!** 🚀

Follow this checklist and your extension will be live on both stores within a week.

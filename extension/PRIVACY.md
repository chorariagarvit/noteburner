# NoteBurner Extension - Privacy Policy

**Last Updated:** November 26, 2026  
**Version:** 1.15.1

## Overview

NoteBurner respects your privacy. This browser extension encrypts your message in your browser, before it leaves your device, and only communicates with NoteBurner servers to create the encrypted message. Our servers only ever hold ciphertext, and we have no way to decrypt it. The website's [privacy policy](https://noteburner.work/privacy) covers the same practices.

## Information We Collect

### Data We DO NOT Collect
The NoteBurner extension does NOT collect:
- ❌ Your browsing history, or the pages you visit
- ❌ The password you protect a message with, or any encryption key
- ❌ Your message in readable form: only ciphertext is sent
- ❌ Your name, email address or other identity (the extension has no accounts)
- ❌ Advertising, analytics or tracking data
- ❌ Cookies or device identifiers

### Data Stored Locally (Your Device Only)
- **Theme choice:** System, Light or Dark, saved in the browser's sync storage for your convenience

This setting is never sent to NoteBurner. Nothing else is stored.

### Data Sent to NoteBurner Servers

When you create an encrypted message, the extension reads the text you selected on the page (only when you open it or use its right-click menu item) or the text you type in the popup, encrypts it on your device, and sends:
- **Encrypted ciphertext** - your message, already encrypted with AES-256-GCM in your browser
- **Expiration time** and the options you choose (for example a view limit)
- **A proof derived from your password** (not the password itself), so the server can release the message only to someone who knows the password
- **A random access token** - a unique ID for the message (not linked to you)

Like any web request, each request also reaches our servers with your IP address. We use it only for rate limiting and abuse protection.

The Firefox manifest declares what is sent as **personal communications** (the message) and **website content** (text you select on a page), because the extension's purpose requires sending them.

**We NEVER receive:**
- ✅ Your password - it stays in your browser
- ✅ Your message in readable form - we only see encrypted data
- ✅ Your identity or personal information

## How We Use Your Data

### Message Creation
1. You type a message and password in the extension
2. Extension encrypts message locally using AES-256-GCM
3. Extension sends encrypted data to our API
4. Server stores encrypted ciphertext and returns a link
5. **Server has no way to decrypt your message**

### Message Access
- Messages are deleted immediately after first access
- Expired messages are automatically purged
- We keep no backups of message data of our own; our hosting provider may keep short-lived infrastructure recovery data that we cannot shorten

## Encryption & Security

### Client-Side Encryption
- **Algorithm:** AES-256-GCM (industry standard)
- **Key Derivation:** PBKDF2 with 300,000 iterations
- **Salt:** Unique random salt per message
- **Encryption happens in YOUR browser before any data transmission**

### Zero-Knowledge Architecture
We use a zero-knowledge design:
- Your password never leaves your device
- Encryption keys are derived locally
- Server only stores encrypted ciphertext
- We cannot decrypt your messages (even if we wanted to)

### Data Transmission
- All API communication uses HTTPS (TLS 1.3)
- Encrypted data only
- No cookies or session tracking

## Permissions Explained

### Why We Need Each Permission

**1. activeTab**
- **Purpose:** Access selected text on the current tab for quick encryption
- **Usage:** When you right-click selected text, we read it to pre-fill the message box
- **Limitation:** Only works on the active tab, only when you trigger it

**2. contextMenus**
- **Purpose:** Add "Encrypt with NoteBurner" option to your right-click menu
- **Usage:** Provides convenient access to encryption feature
- **Limitation:** Menu item only - no data access

**3. storage**
- **Purpose:** Save your preferences (dark mode, default expiration)
- **Usage:** Remember your settings between sessions
- **Limitation:** Only stores user preferences, no sensitive data

**4. Host Permission (noteburner.work)**
- **Purpose:** Communicate with NoteBurner API to create/store encrypted messages
- **Usage:** Send encrypted ciphertext, receive shareable links
- **Limitation:** Only talks to NoteBurner servers, not other sites

## Third-Party Services

### We Do NOT Use
- ❌ Google Analytics or any analytics
- ❌ Ad networks or trackers
- ❌ Social media pixels
- ❌ Error reporting services (Sentry, etc.)
- ❌ CDNs for external code
- ❌ Any third-party JavaScript libraries that phone home

### Our Infrastructure
- **Hosting:** Cloudflare Workers (serverless, no persistent servers)
- **Database:** Cloudflare D1 (only encrypted ciphertext + metadata)
- **Storage:** Cloudflare R2 (encrypted files only)

## Data Retention & Deletion

### Automatic Deletion
- Messages delete after **first access** (one-time read)
- Messages auto-expire based on your chosen time (1 hour to 7 days)
- Expired messages purged within 1 hour of expiration
- Deleted messages are **permanently** removed (no backups, no recovery)

### User Control
- You control message lifespan
- No account = nothing to delete
- Uninstall extension = all local preferences removed
- Clear browser data = all extension storage cleared

## Children's Privacy

NoteBurner does not knowingly collect information from anyone under 13 years of age. The extension has no age verification or user accounts.

## International Data Transfer

- **Server Location:** United States (Cloudflare global network)
- **Data Processed:** Only encrypted ciphertext (already protected)
- **Compliance:** GDPR-friendly (data minimised: only ciphertext is stored, and there are no accounts)

## Your Rights

### You Have the Right To:
- ✅ Use the extension anonymously (no account required)
- ✅ Control your message expiration times
- ✅ Delete messages before expiration (via link access)
- ✅ Uninstall extension at any time
- ✅ Request information about our practices

### How to Exercise Your Rights:
- **Delete Data:** Access the message link (deletes it) or wait for expiration
- **Stop Data Collection:** Uninstall the extension
- **Review Practices:** Read this policy or contact us

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Changes will be:
- Posted in extension updates
- Dated at the top of this document
- Communicated through extension changelog

**Material changes** (like new data collection) will require explicit user consent.

## Open Source Transparency

NoteBurner extension is open source:
- **Source Code:** Available on GitHub
- **Audit:** Anyone can review our code
- **No Hidden Behavior:** What you see is what you get

## Contact Information

### Privacy Questions or Concerns:
- **Email:** privacy@noteburner.work
- **Website:** https://noteburner.work
- **GitHub:** https://github.com/chorariagarvit/noteburner

### Data Protection Officer:
Currently not required (no personal data processing)

## Legal Compliance

- **GDPR:** Data minimised: only ciphertext is stored, and there are no accounts
- **CCPA:** Compliant (no sale of personal information)
- **COPPA:** Compliant (no collection from children)

---

**TL;DR:** We encrypt your messages locally, send encrypted data to our server, and delete it after access. We never see your password or original message. No tracking, no accounts, no BS.

**Last Updated:** January 17, 2026  
**Effective Date:** January 17, 2026  
**Version:** 1.0.0

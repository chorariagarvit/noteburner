# NoteBurner Extension - Privacy Policy

**Last Updated:** January 17, 2026  
**Version:** 1.0.0

## Overview

NoteBurner respects your privacy. This browser extension processes your data locally in your browser and only communicates with NoteBurner servers to create encrypted messages.

## Information We Collect

### Data We DO NOT Collect
The NoteBurner extension does NOT collect, store, or transmit:
- ❌ Your personal information or identity
- ❌ Browsing history or website visits
- ❌ Passwords or encryption keys
- ❌ Message content before encryption
- ❌ Analytics or tracking data
- ❌ Cookies or device identifiers

### Data Stored Locally (Your Device Only)
- **Dark Mode Preference:** Saved in Chrome/Firefox sync storage for your convenience
- **Default Settings:** Your preferred message expiration time (stored locally)

This data never leaves your device and is controlled entirely by you.

### Data Sent to NoteBurner Servers

When you explicitly create an encrypted message, we receive:
- **Encrypted ciphertext** - Your message already encrypted with AES-256 in your browser
- **Expiration timestamp** - When the message should auto-delete
- **Random access token** - A unique ID for the message (not linked to you)
- **Optional metadata** - Message size, creation time (for server management)

**We NEVER receive:**
- ✅ Your password - Stays in your browser forever
- ✅ Decrypted message content - We only see encrypted data
- ✅ Your identity or personal information
- ✅ Your IP address - Not logged or stored

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
- No backups are created - deletion is permanent

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
- **Compliance:** GDPR-friendly (no personal data collected)

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

- **GDPR:** Compliant (no personal data collected)
- **CCPA:** Compliant (no sale of personal information)
- **COPPA:** Compliant (no collection from children)

---

**TL;DR:** We encrypt your messages locally, send encrypted data to our server, and delete it after access. We never see your password or original message. No tracking, no accounts, no BS.

**Last Updated:** January 17, 2026  
**Effective Date:** January 17, 2026  
**Version:** 1.0.0

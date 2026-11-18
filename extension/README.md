# NoteBurner Browser Extension

🔥 Send self-destructing encrypted messages directly from any webpage.

## Features

- **Right-click Context Menu**: Select text and right-click to send via NoteBurner
- **Floating Action Button**: Quick access button appears when text is selected
- **Quick Encrypt Popup**: Click extension icon for instant encryption
- **Password Generation**: Built-in secure password generator
- **Dark Mode**: Toggle between light and dark themes
- **Cross-browser**: Works on Chrome, Edge, and Firefox
- **Privacy-First**: All encryption happens locally in your browser

## Installation

### From Web Stores (Coming Soon)
- **Chrome Web Store**: [Add to Chrome](#) (Pending approval)
- **Firefox Add-ons**: [Add to Firefox](#) (Pending approval)

### Manual Installation (Development)

#### Chrome/Edge

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension` folder from this repository
5. The NoteBurner extension should now appear in your extensions

#### Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the `extension` folder and select `manifest.json`
4. The extension will be loaded temporarily

## Usage

### Method 1: Context Menu
1. Select any text on a webpage
2. Right-click and choose "Encrypt with NoteBurner"
3. NoteBurner will open with the selected text pre-filled

### Method 2: Floating Button
1. Select text on any webpage
2. Click the floating 🔥 button that appears
3. NoteBurner will open with the selected text

### Method 3: Extension Popup
1. Click the NoteBurner extension icon in your browser toolbar
2. Type or paste your message
3. Set a password (or generate one with 🎲)
4. Choose expiration time (1h - 7 days)
5. Click "Encrypt & Create Link"
6. Copy and share the generated link

### Dark Mode
- Click the 🌙/☀️ button in the popup header to toggle dark mode
- Preference is saved across sessions

## Permissions

The extension requires these permissions:

- **contextMenus**: For right-click "Encrypt with NoteBurner" option
- **activeTab**: To read selected text from the current tab for quick encryption
- **storage**: To save dark mode preference and user settings
- **host_permissions (noteburner.work)**: To communicate with NoteBurner API for message creation

See [PRIVACY.md](./PRIVACY.md) for detailed privacy policy.

## Security

- ✅ All encryption happens locally in your browser
- ✅ Messages are encrypted using AES-256-GCM
- ✅ Passwords never leave your device
- ✅ Zero-knowledge architecture
- ✅ Only encrypted ciphertext is transmitted to servers
- ✅ No tracking, analytics, or data collection

## Publishing

See [PUBLISHING.md](./PUBLISHING.md) for complete guide to publishing on Chrome Web Store and Firefox Add-ons.

### Quick Build

Generate icons (already done):
```bash
node generate-icons.js
```

Create distribution package:
```bash
cd extension
zip -r noteburner-extension.zip . -x "*.git*" -x "generate-icons.js" -x "icons/create-icons.html"
```

## Development

The extension uses **Manifest V3** for Chrome/Edge compatibility and is also compatible with Firefox WebExtensions.

**File Structure:**
- `manifest.json` - Extension configuration (Manifest V3)
- `background.js` - Background service worker (context menu)
- `content.js` - Content script for page interaction (floating button)
- `popup.html/js/css` - Extension popup UI with dark mode
- `crypto.js` - Client-side encryption utilities (AES-256-GCM)
- `icons/` - Extension icons (16, 48, 128px)
- `PRIVACY.md` - Privacy policy for store submission
- `PUBLISHING.md` - Complete publishing guide

## License

MIT License - See main repository for details
- `crypto.js` - Encryption utilities

## Changelog

### v1.14.0 (2026-11-17)
- Authenticates with the NoteBurner API: fetches a short-lived signed app token (`POST /api/app-token`) and sends it as `X-App-Token` on every request. Required since the API now rejects unauthenticated calls.
- Added API hosts to `host_permissions` (Chrome and Firefox manifests)
- Replaced `innerHTML` with `textContent` in the popup and content script
- Version aligned with the web app (was 1.0.0)
- Friendlier errors: rate limiting ("wait N seconds"), oversized messages, outages, gateway error pages and network failures no longer show raw `429: Too Many Requests` text
- 30-second timeout on every API call so the popup can't hang; "No expiration" now sends no expiry instead of `NaN`
- When the server requires a Turnstile human check, the popup opens noteburner.work/create with the text prefilled (the widget can't run in an extension)
- New tests (`npm run test:extension`): crypto parity with the web app (auth tag, cross-decryption), the request contract against a mock API, manifest/source consistency

### v1.0.0 (2026-01-14)
- Initial release
- Context menu integration
- Floating action button
- Quick encrypt popup
- Password generator
- Chrome, Edge, and Firefox support

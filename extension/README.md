# NoteBurner Browser Extension

Send self-destructing encrypted messages directly from any webpage.

## Features

- **Right-click Context Menu**: Select text and right-click to send via NoteBurner
- **Floating Action Button**: Quick access button appears when text is selected
- **Quick Encrypt Popup**: Click extension icon for instant encryption
- **Password Generation**: Built-in secure password generator
- **Cross-browser**: Works on Chrome, Edge, and Firefox

## Installation

### Chrome/Edge (Development)

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension` folder from this repository
5. The NoteBurner extension should now appear in your extensions

### Firefox (Development)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the `extension` folder and select `manifest.json`
4. The extension will be loaded temporarily

## Usage

### Method 1: Context Menu
1. Select any text on a webpage
2. Right-click and choose "Send via NoteBurner"
3. NoteBurner will open with the selected text pre-filled

### Method 2: Floating Button
1. Select text on any webpage
2. Click the floating 🔥 button that appears
3. NoteBurner will open with the selected text

### Method 3: Extension Popup
1. Click the NoteBurner extension icon in your browser toolbar
2. Type or paste your message
3. Set a password (or generate one)
4. Choose expiration time
5. Click "Create Secure Link"
6. Copy and share the generated link

## Permissions

- **contextMenus**: For right-click "Send via NoteBurner" option
- **activeTab**: To read selected text from the current tab
- **storage**: To save user preferences (future feature)
- **host_permissions**: To communicate with NoteBurner API

## Security

- All encryption happens locally in your browser
- Messages are encrypted using AES-256-GCM
- Passwords are never sent to the server
- Only encrypted data is transmitted

## Building for Production

To create a production build:

1. Remove localhost from `host_permissions` in `manifest.json`
2. Create icons (16x16, 48x48, 128x128) and place in `icons/` folder
3. Zip the extension folder: `zip -r noteburner-extension.zip extension/`
4. Submit to Chrome Web Store or Firefox Add-ons

## Development

The extension uses Manifest V3 for Chrome/Edge compatibility and is also compatible with Firefox WebExtensions.

**File Structure:**
- `manifest.json` - Extension configuration
- `background.js` - Background service worker
- `content.js` - Content script for page interaction
- `popup.html/js/css` - Extension popup UI
- `crypto.js` - Encryption utilities

## Changelog

### v1.0.0 (2026-01-14)
- Initial release
- Context menu integration
- Floating action button
- Quick encrypt popup
- Password generator
- Chrome, Edge, and Firefox support

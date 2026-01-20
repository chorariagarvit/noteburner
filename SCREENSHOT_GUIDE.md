# Chrome Web Store Screenshots Guide

## Required Screenshots (5 images)

Chrome Web Store requires **1280x800** or **640x400** screenshots in PNG or JPEG format.

## 📸 How to Take Screenshots

### Step 1: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select `/mnt/c/Gary/Ubuntu-Data/noteburner/extension` folder

### Step 2: Open Extension Popup

1. Click the **Extensions puzzle icon** in Chrome toolbar
2. Click **NoteBurner** extension
3. Popup will open (400px wide)

### Step 3: Take Screenshots

Use browser developer tools or screenshot tool to capture at **1280x800** resolution.

---

## Screenshot Checklist

### Screenshot 1: Main Interface (Empty State)
**Filename**: `1-main-interface.png`

**Show**:
- Extension popup open
- Empty message field with placeholder text
- Password field (empty)
- Generate Password button visible
- Expiration dropdown (24 hours selected)
- Dark theme UI
- "Encrypt & Create Link" button

**How to capture**:
- Open popup
- Don't type anything
- Take screenshot at 1280x800

---

### Screenshot 2: Message Input
**Filename**: `2-message-entered.png`

**Show**:
- Message typed in text area: "This confidential message will self-destruct after reading!"
- Password still empty or being entered
- All UI elements visible

**How to capture**:
- Type message in text area
- Take screenshot at 1280x800

---

### Screenshot 3: Password Generated
**Filename**: `3-password-generated.png`

**Show**:
- Message entered
- Password field filled with generated password (16+ chars)
- "Generate Password" button highlighted or just clicked
- Show strong password like: `K9mP#vL2nQ7xR5tW`

**How to capture**:
- Keep message from screenshot 2
- Click "Generate Password" button
- Take screenshot immediately

---

### Screenshot 4: Right-Click Context Menu
**Filename**: `4-context-menu.png`

**Show**:
- A webpage open in background
- Text selected on the page
- Right-click context menu showing "Encrypt Selected Text" option

**How to capture**:
1. Go to any webpage
2. Select some text
3. Right-click to show context menu
4. Take screenshot showing the menu with "Encrypt Selected Text" option

---

### Screenshot 5: Success State (Share Link)
**Filename**: `5-success-share-link.png`

**Show**:
- "Message Created Successfully!" heading
- Share URL displayed: `https://noteburner.work/m/abc123xyz`
- Copy button next to URL
- Password shown
- "Message expires in 24 hours" text
- QR code (if visible)
- "Create New Message" button

**How to capture**:
- Complete the encryption flow
- Wait for success screen
- Take screenshot of success state

---

## Alternative: Use Chrome DevTools

### Option 1: Screenshot Specific Element

```javascript
// Open popup, then in DevTools Console:
document.querySelector('body').style.width = '1280px';
document.querySelector('body').style.height = '800px';
// Then use DevTools screenshot tool (Cmd/Ctrl + Shift + P > "Screenshot")
```

### Option 2: Set Custom Viewport

1. Open popup
2. F12 to open DevTools
3. Click **Toggle Device Toolbar** (Cmd/Ctrl + Shift + M)
4. Set dimensions to **1280 x 800**
5. Click **Capture screenshot** icon

---

## Quick Screenshot Commands (Linux/Mac)

### Linux (using scrot or gnome-screenshot)
```bash
# Full screen
gnome-screenshot -w

# Delay 5 seconds for setup
gnome-screenshot -w -d 5
```

### Mac (using screencapture)
```bash
# Interactive selection
screencapture -i screenshot.png

# Timed screenshot (5 second delay)
screencapture -T 5 screenshot.png
```

### Windows (using Snipping Tool)
1. Win + Shift + S
2. Select area
3. Save as PNG

---

## Screenshot Dimensions Requirements

**Chrome Web Store accepts**:
- ✅ 1280x800 (recommended)
- ✅ 640x400
- Must be **same aspect ratio** across all screenshots
- Format: PNG or JPEG
- Max file size: 5MB per image

## Final Checklist

- [ ] All 5 screenshots taken
- [ ] All at 1280x800 resolution
- [ ] All in PNG format
- [ ] File names clear and numbered
- [ ] Screenshots show clean, professional UI
- [ ] No sensitive data visible
- [ ] Dark mode enabled (matches extension theme)
- [ ] Text is readable and crisp
- [ ] No browser chrome/borders (just extension content)

---

## Upload Location

Save screenshots to:
```
/mnt/c/Gary/Ubuntu-Data/noteburner/extension-screenshots/
```

Then upload to Chrome Web Store Developer Dashboard:
https://chrome.google.com/webstore/devconsole

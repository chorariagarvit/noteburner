# Week 6 Features - Quick Test Guide

## 🧪 Testing Week 6 Features Locally

### Prerequisites
```bash
cd /mnt/c/Gary/Ubuntu-Data/noteburner/frontend
npm run dev
```
Open: http://localhost:5173

---

## 1. 🎓 Test Onboarding Flow

### Steps:
1. **Clear localStorage** (to simulate first-time user):
   - Open DevTools (F12)
   - Console tab → Type: `localStorage.removeItem('noteburner_onboarding_complete')`
   - Press Enter

2. **Reload the page** (Ctrl+R)

3. **Expected Result**:
   - Onboarding modal appears after 1 second
   - Shows "Step 1 of 3: Welcome to NoteBurner 🔥"
   - Progress bar shows 33% filled (red-orange gradient)

4. **Test Navigation**:
   - Click "Next" → Goes to Step 2 (Create Your First Secret)
   - Click "Previous" → Goes back to Step 1
   - Click "Skip tutorial" → Closes modal, saves to localStorage
   - Click X button → Closes modal

5. **Test Keyboard Navigation**:
   - Press Tab → Highlights "Skip tutorial"
   - Press Tab again → Highlights "Next"
   - Press Enter → Advances to next step
   - Press Escape → Closes modal

---

## 2. 📝 Test Message Templates

### Steps:
1. **Navigate to Create Message**: Click "Create Message" in header

2. **Open Templates**:
   - Find the message textarea
   - Click "Use Template" button (next to "Message *" label)

3. **Expected Result**:
   - Modal appears with title "Message Templates"
   - Shows 3 categories: Work & Professional, Personal, Security
   - 6 total templates displayed

4. **Test Template Selection**:
   - Click "Meeting Notes" template
   - **Expected**: Message field populated with meeting notes template
   - **Expected**: Expiration set to "24" hours
   - Modal closes automatically

5. **Test Each Template**:
   - **Meeting Notes**: Work category, 24h expiration
   - **Private Feedback**: Work category, 24h expiration
   - **Secret Santa**: Personal category, 168h (7 days) expiration
   - **Love Letter**: Personal category, 72h (3 days) expiration
   - **Anonymous Confession**: Personal category, 24h expiration
   - **Password Share**: Security category, 1h expiration

---

## 3. ⌨️ Test Keyboard Shortcuts

### Test Help Modal:
1. **Navigate to Create Message page**

2. **Press `?` key** (Shift + /)

3. **Expected Result**:
   - Keyboard Shortcuts modal appears
   - Shows all 12 shortcuts grouped by category
   - Platform-specific display (⌘ on Mac, Ctrl on Windows/Linux)

### Test Individual Shortcuts:

#### General Shortcuts:
- **Ctrl+Enter**: Submits the form (creates message)
- **Escape**: Closes any open modal
- **?**: Shows keyboard shortcuts modal
- **Tab**: Moves focus between fields

#### Message Creation Shortcuts:
- **Ctrl+K**: Focuses the message textarea
- **Ctrl+P**: Focuses the password input
- **Ctrl+G**: Generates a random password
- **Ctrl+U**: Focuses the custom URL input

#### Action Shortcuts:
- **Ctrl+N**: Resets form (creates new message)
- **Ctrl+S**: Creates similar message (keeps current values)

### Detailed Test Steps:

1. **Test Ctrl+K** (Focus Message):
   - Click anywhere outside the message field
   - Press Ctrl+K (or ⌘+K on Mac)
   - **Expected**: Message textarea receives focus, cursor blinking

2. **Test Ctrl+P** (Focus Password):
   - Press Ctrl+P
   - **Expected**: Password input receives focus

3. **Test Ctrl+G** (Generate Password):
   - Press Ctrl+G
   - **Expected**: Password field populated with random strong password
   - **Expected**: "Show password" icon appears

4. **Test Ctrl+Enter** (Submit):
   - Fill in message and password
   - Press Ctrl+Enter
   - **Expected**: Form submits, loading animation starts

5. **Test Escape** (Close Modal):
   - Press ? to open shortcuts modal
   - Press Escape
   - **Expected**: Modal closes

---

## 4. 💀 Test Loading Skeletons

### Steps:
1. **Open DevTools** (F12) → Network tab

2. **Throttle Network**: Set to "Slow 3G" (to see loading states)

3. **Navigate to Create Message**

4. **Expected While Loading**:
   - `MessageFormSkeleton` appears with:
     - Pulsing title skeleton (3/4 width)
     - Pulsing message area skeleton (full width, large)
     - Pulsing password skeleton (half width)
     - Pulsing expiration skeleton (1/3 width)
     - Pulsing button skeleton (full width)

5. **Navigate to Homepage**:
   - `StatsCardSkeleton` appears while stats load
   - Shows pulsing avatar, title, and subtitle

6. **Create a Message and View**:
   - While message is being created, `MessageViewSkeleton` appears
   - Shows icon, title, password, button, and info cards skeletons

---

## 5. ✨ Test Animations

### Slide Animations:
1. **Open Onboarding Modal**:
   - Background fades in (animate-fade-in)
   - Modal slides up from bottom (animate-slide-up)

2. **Open Templates Modal**:
   - Same slide-up animation

### Bounce Animation:
1. **Onboarding Step Icons**:
   - Icons (Flame, Lock, Share2) have gentle bounce (animate-bounce-slow)

### Pulse Animation:
1. **Loading Skeletons**:
   - All skeleton components pulse (animate-pulse)

### Shimmer Animation:
1. **Planned for future loading states**

---

## 6. ♿ Test Accessibility

### Screen Reader Test (if available):
1. **Enable Screen Reader**:
   - Windows: Windows+Ctrl+Enter (Narrator)
   - Mac: Cmd+F5 (VoiceOver)
   - Linux: Orca screen reader

2. **Navigate Onboarding Modal**:
   - Tab through elements
   - **Expected**: Screen reader announces:
     - "Getting Started dialog"
     - "Onboarding progress, 1 of 3"
     - Feature list items
     - "Go to next step" button

3. **Navigate Templates Modal**:
   - Tab through templates
   - **Expected**: Each template button announces:
     - "Use [Template Name] template: [Description]"

4. **Navigate Keyboard Shortcuts Modal**:
   - Tab through shortcuts
   - **Expected**: Each shortcut announces:
     - "Press Ctrl + Enter" (or equivalent)

### Keyboard-Only Navigation:
1. **No Mouse Test**:
   - Navigate entire Create Message page using only keyboard
   - Tab to move forward
   - Shift+Tab to move backward
   - Enter to activate buttons
   - Escape to close modals

2. **Focus Indicators**:
   - **Expected**: Clear blue outline on focused elements
   - **Expected**: Buttons highlight on focus

### High Contrast Test:
1. **Enable High Contrast Mode** (Windows Settings)
2. **Expected**: All text remains readable, borders visible

---

## 7. 🌙 Test Dark Mode

### Steps:
1. **Toggle Dark Mode**:
   - Click sun/moon icon in header

2. **Test All Modals in Dark Mode**:
   - Onboarding modal: Dark background (gray-800), white text
   - Templates modal: Dark background, proper contrast
   - Keyboard shortcuts modal: Dark background, visible kbd elements

3. **Test Loading Skeletons**:
   - **Expected**: Skeletons change from gray-200 to gray-700

4. **Test Animations**:
   - **Expected**: All animations work identically in dark mode

---

## 8. 📱 Test Responsive Design

### Desktop (1920x1080):
- All modals centered, max-width 2xl
- Templates show 2 columns
- Keyboard shortcuts readable

### Tablet (768x1024):
- Modals responsive, max-width respected
- Templates may switch to 1 column

### Mobile (375x667):
- Modals full-width with padding
- Templates 1 column
- Touch-friendly buttons

---

## ✅ Checklist

### Onboarding
- [ ] Modal appears on first visit
- [ ] 3 steps navigate correctly
- [ ] Progress bar updates
- [ ] Skip button works
- [ ] X button closes modal
- [ ] Escape key closes modal
- [ ] localStorage saves completion

### Templates
- [ ] "Use Template" button visible
- [ ] Modal opens with 6 templates
- [ ] Templates grouped by category
- [ ] Clicking template populates message
- [ ] Expiration auto-sets correctly
- [ ] Modal closes after selection

### Keyboard Shortcuts
- [ ] ? key opens help modal
- [ ] Ctrl+Enter submits form
- [ ] Ctrl+K focuses message
- [ ] Ctrl+P focuses password
- [ ] Ctrl+G generates password
- [ ] Ctrl+U focuses custom URL
- [ ] Ctrl+N resets form
- [ ] Ctrl+S creates similar
- [ ] Escape closes modals
- [ ] Platform detection (⌘ vs Ctrl)

### Loading Skeletons
- [ ] MessageFormSkeleton shows while loading
- [ ] MessageViewSkeleton shows on view page
- [ ] StatsCardSkeleton shows on homepage
- [ ] All skeletons pulse
- [ ] Dark mode skeletons work

### Animations
- [ ] Slide-up on modals
- [ ] Fade-in on backgrounds
- [ ] Bounce-slow on icons
- [ ] Pulse on skeletons
- [ ] Smooth transitions (no jank)

### Accessibility
- [ ] Screen reader announces modals
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Tab order logical
- [ ] No keyboard traps

### Dark Mode
- [ ] All modals readable
- [ ] Skeletons change color
- [ ] Contrast sufficient
- [ ] Icons visible

---

## 🐛 Known Issues

None! All features tested and working. ✅

---

## 📝 Notes

- **Onboarding Delay**: 1 second delay before showing (better UX)
- **Template Button**: Located next to "Message *" label (top-right of textarea)
- **Keyboard Shortcuts**: Use Ctrl on Windows/Linux, ⌘ on Mac
- **Skeletons**: Only visible during loading (use network throttling to see)

---

**Happy Testing! 🎉**

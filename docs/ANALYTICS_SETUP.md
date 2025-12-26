# Analytics Setup Guide

Complete guide for setting up analytics tracking in NoteBurner.

## Overview

NoteBurner supports three analytics platforms:
- **Google Tag Manager (GTM)**: Universal tag management
- **Google Analytics 4 (GA4)**: Website analytics and insights
- **Microsoft Clarity**: Session recordings and heatmaps

## 1. Google Tag Manager Setup

### Why Use GTM?

GTM allows you to manage all your tracking tags (GA4, ads, pixels) from one interface without code changes.

### Setup Steps

1. **Create GTM Account**
   - Go to [https://tagmanager.google.com](https://tagmanager.google.com)
   - Sign in with Google account
   - Click **Create Account**
   - Enter account name: "NoteBurner"
   - Select **Web** container type

2. **Get Container ID**
   - Format: `GTM-XXXXXXX`
   - Copy from GTM dashboard

3. **Configure Environment Variable**
   ```bash
   # frontend/.env
   VITE_GTM_ID=GTM-XXXXXXX
   ```

4. **Configure Tags in GTM** (Optional)
   - Add GA4 tag
   - Add conversion pixels
   - Set up custom events

### GTM Best Practices

- **Workspaces**: Use different workspaces for dev/staging/prod
- **Versioning**: Always publish with version descriptions
- **Testing**: Use Preview mode before publishing
- **Tags**: Group related tags in folders

## 2. Google Analytics 4 Setup

### Why Use GA4?

- Track user behavior and conversions
- Understand traffic sources
- Monitor engagement metrics
- Create custom reports

### Setup Steps

1. **Create GA4 Property**
   - Go to [https://analytics.google.com](https://analytics.google.com)
   - Click **Admin** → **Create Property**
   - Enter property name: "NoteBurner"
   - Select timezone and currency
   - Click **Create**

2. **Get Measurement ID**
   - Navigate to **Admin** → **Data Streams**
   - Click **Add stream** → **Web**
   - Enter website URL: `https://noteburner.work`
   - Copy **Measurement ID** (format: `G-XXXXXXXXXX`)

3. **Configure Environment Variable**
   ```bash
   # frontend/.env
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

4. **Enable Enhanced Measurement** (Recommended)
   - In Data Stream settings, enable:
     - ✅ Page views
     - ✅ Scrolls
     - ✅ Outbound clicks
     - ✅ Site search
     - ✅ Video engagement
     - ✅ File downloads

### GA4 vs GTM

You can use either approach:

**Option 1: Direct GA4** (Current implementation)
- Simpler setup
- Direct GA4 integration
- Good for basic tracking

**Option 2: GA4 via GTM** (Recommended for production)
- More flexible
- Manage all tags in one place
- Better for multiple tracking tools

To use GTM for GA4:
1. Only set `VITE_GTM_ID` (remove `VITE_GA_MEASUREMENT_ID`)
2. Add GA4 tag in GTM dashboard
3. Configure GA4 settings in GTM

## 3. Microsoft Clarity Setup

See [CLARITY_SETUP.md](CLARITY_SETUP.md) for detailed instructions.

Quick setup:
```bash
# frontend/.env
VITE_CLARITY_ID=your_project_id
```

## Environment Variables Summary

```bash
# Analytics Configuration
VITE_CLARITY_ID=urj0cl8fft
VITE_GTM_ID=GTM-XXXXXXX
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**For Production (Cloudflare Pages):**
1. Go to Pages project → **Settings** → **Environment Variables**
2. Add all three variables
3. Redeploy

## Custom Event Tracking

### Track Events

```javascript
import { trackEvent } from './utils/analytics';
import { trackEvent as trackClarityEvent } from './utils/clarity';

// Message created
trackEvent('message_created', {
  has_password: true,
  expires_in: '24h',
  file_count: 2
});

// Message burned
trackEvent('message_burned', {
  message_age_minutes: 15
});

// CTA clicked
trackEvent('cta_click', {
  button_text: 'Create Your Secret Message',
  location: 'post_burn'
});
```

### Track Page Views (SPA)

```javascript
import { trackPageView } from './utils/analytics';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);
}
```

### Set User Properties

```javascript
import { setUserProperties } from './utils/analytics';

setUserProperties({
  user_type: 'premium',
  theme: 'dark',
  language: 'en'
});
```

## Recommended Events to Track

### Core Events
- `message_created` - When user creates a message
- `message_viewed` - When recipient views preview page
- `message_burned` - When message is successfully decrypted
- `file_uploaded` - When file is attached
- `password_incorrect` - Failed password attempt

### Engagement Events
- `cta_click` - CTA button clicks
- `copy_url` - Message URL copied to clipboard
- `share_click` - Social share button clicked
- `confetti_shown` - Confetti animation triggered

### Conversion Events
- `first_message` - User's first message created
- `return_user` - User creates 2nd+ message
- `large_file_upload` - File >10MB uploaded

## Privacy & Compliance

### GDPR Compliance

**GA4 Settings:**
- Enable **IP Anonymization**
- Enable **Data Deletion Requests**
- Configure **Data Retention** (14 months recommended)

**Cookie Consent** (if required):
```javascript
// Only initialize after consent
if (userConsentedToCookies) {
  initGTM();
  initGA4();
  initClarity();
}
```

### Data to Exclude

Never track sensitive data:
- ❌ Message content (encrypted or not)
- ❌ Passwords
- ❌ File contents
- ❌ Personal information
- ❌ Token values

Safe to track:
- ✅ Message created (yes/no)
- ✅ Has password (yes/no)
- ✅ Expiration time selected
- ✅ Number of files
- ✅ File sizes (aggregated)
- ✅ User journey events

## Testing Analytics

### 1. Development Testing

```bash
# Set test IDs in .env
VITE_GTM_ID=GTM-XXXXXXX
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_CLARITY_ID=test_project_id

# Start dev server
npm run dev
```

Check browser console for:
```
Google Tag Manager initialized with ID: GTM-XXXXXXX
Google Analytics initialized with ID: G-XXXXXXXXXX
Microsoft Clarity initialized
```

### 2. GTM Preview Mode

1. In GTM dashboard, click **Preview**
2. Enter your website URL
3. Browse your site
4. See tags firing in real-time

### 3. GA4 Real-Time Reports

1. In GA4, go to **Reports** → **Realtime**
2. Visit your website
3. See events appear within seconds

### 4. Clarity Dashboard

1. Go to [clarity.microsoft.com](https://clarity.microsoft.com)
2. Select your project
3. Wait 5-10 minutes for first session
4. View recordings and heatmaps

## Debugging

### Check if Scripts Loaded

```javascript
// In browser console
console.log('GTM:', !!window.dataLayer);
console.log('GA4:', !!window.gtag);
console.log('Clarity:', !!window.clarity);
```

### Common Issues

**Events not showing in GA4:**
- Check Measurement ID is correct
- Wait 24-48 hours for data processing
- Use DebugView for real-time events

**GTM tags not firing:**
- Use Preview mode to debug
- Check trigger conditions
- Verify tag configuration

**Clarity not recording:**
- Check project ID
- Disable ad blockers
- Wait 10 minutes for first session

## Performance Considerations

All scripts load **asynchronously** and won't block page rendering:

```javascript
script.async = true;  // Non-blocking
```

**Impact:**
- GTM: ~30KB (gzipped)
- GA4: ~15KB (gzipped)
- Clarity: ~20KB (gzipped)
- **Total: ~65KB** - minimal impact

## Dashboard Links

- **GTM**: https://tagmanager.google.com
- **GA4**: https://analytics.google.com
- **Clarity**: https://clarity.microsoft.com

## Support Resources

### Google Tag Manager
- [GTM Documentation](https://support.google.com/tagmanager)
- [GTM Developer Guide](https://developers.google.com/tag-manager)

### Google Analytics 4
- [GA4 Help Center](https://support.google.com/analytics)
- [GA4 for Developers](https://developers.google.com/analytics/devguides/collection/ga4)

### Microsoft Clarity
- [Clarity Docs](https://docs.microsoft.com/en-us/clarity/)
- [Clarity GitHub](https://github.com/microsoft/clarity)

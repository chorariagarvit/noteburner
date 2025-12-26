# Microsoft Clarity Setup for NoteBurner

Microsoft Clarity is a free analytics tool that provides:
- **Session Recordings**: Watch how users interact with your app
- **Heatmaps**: See where users click, scroll, and spend time
- **Insights**: Understand user behavior and frustrations

## Setup Instructions

### 1. Create a Clarity Account

1. Go to [https://clarity.microsoft.com](https://clarity.microsoft.com)
2. Sign in with your Microsoft account (or create one)
3. Click **Add New Project**
4. Enter project details:
   - **Name**: NoteBurner
   - **Website URL**: https://noteburner.work (or your domain)
5. Click **Get tracking code**
6. Copy your **Project ID** (looks like: `abc123xyz`)

### 2. Configure Environment Variable

Add your Clarity Project ID to the environment file:

**For Development (`frontend/.env`):**
```bash
VITE_CLARITY_ID=your_clarity_project_id
```

**For Production (Cloudflare Pages):**
1. Go to your Cloudflare Pages project
2. Navigate to **Settings** > **Environment Variables**
3. Add variable:
   - **Variable name**: `VITE_CLARITY_ID`
   - **Value**: Your Clarity Project ID
   - **Environment**: Production

### 3. Verify Installation

1. Deploy your changes
2. Visit your website
3. Go to Clarity dashboard
4. You should see "Receiving data" within a few minutes

## Usage

### Automatic Tracking

Clarity automatically tracks:
- Page views
- Clicks and taps
- Scrolling behavior
- Form interactions
- Rage clicks (repeated clicks on same element)

### Custom Events (Optional)

Track custom events in your code:

```javascript
import { trackEvent } from './utils/clarity';

// Track message creation
trackEvent('message_created', { 
  hasPassword: true,
  expiresIn: '24h' 
});

// Track message burn
trackEvent('message_burned');
```

### Custom Tags (Optional)

Set user properties:

```javascript
import { setTag } from './utils/clarity';

// Tag user type
setTag('user_type', 'premium');
setTag('theme', 'dark');
```

## Privacy Considerations

Clarity is privacy-friendly:
- ✅ No PII (Personally Identifiable Information) captured
- ✅ GDPR compliant
- ✅ Sensitive data can be masked
- ✅ IP addresses are hashed

### Masking Sensitive Data

Add `clarity-mask` class to elements you want to hide from recordings:

```jsx
<input 
  type="password" 
  className="clarity-mask" 
  placeholder="Enter password"
/>
```

## Dashboard Features

### Session Recordings
- Watch real user sessions
- Filter by device, browser, country
- See user frustration signals (rage clicks, dead clicks)

### Heatmaps
- Click heatmaps: Where users click most
- Scroll heatmaps: How far users scroll
- Area heatmaps: Which sections get attention

### Insights
- **Rage clicks**: Users clicking repeatedly (indicates frustration)
- **Dead clicks**: Clicks on non-interactive elements
- **Quick backs**: Users leaving immediately after arriving
- **Excessive scrolling**: Users scrolling up/down repeatedly

## Troubleshooting

### No Data Showing

1. **Check Project ID**: Verify `VITE_CLARITY_ID` is set correctly
2. **Check Console**: Look for "Microsoft Clarity initialized" message
3. **Wait 5-10 minutes**: Data may take time to appear
4. **Disable Ad Blockers**: Some ad blockers prevent tracking scripts

### Development vs Production

- Clarity won't initialize if `VITE_CLARITY_ID` is not set
- Use different project IDs for dev/staging/production if needed
- Check browser console for initialization messages

## Best Practices

1. **Use Filters**: Create segments for specific user behaviors
2. **Watch Frustration Signals**: Focus on sessions with rage clicks
3. **Mobile vs Desktop**: Analyze separately for better insights
4. **Before/After**: Record sessions before and after major changes
5. **Privacy First**: Always mask sensitive input fields

## Resources

- [Clarity Documentation](https://docs.microsoft.com/en-us/clarity/)
- [Privacy & GDPR](https://docs.microsoft.com/en-us/clarity/privacy)
- [API Reference](https://docs.microsoft.com/en-us/clarity/api)

## Support

- **Dashboard**: https://clarity.microsoft.com
- **Community**: https://github.com/microsoft/clarity
- **Status**: https://status.clarity.ms

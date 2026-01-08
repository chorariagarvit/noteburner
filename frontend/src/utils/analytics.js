// Google Tag Manager Integration

export function initGTM() {
  const gtmId = import.meta.env.VITE_GTM_ID;
  
  if (!gtmId || gtmId === 'GTM-XXXXXXX') {
    return;
  }

  // Check if already initialized
  if (globalThis.dataLayer) {
    return;
  }

  // Initialize dataLayer
  globalThis.dataLayer = globalThis.dataLayer || [];
  globalThis.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js'
  });

  // Load GTM script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);
}

// Google Analytics 4 Integration

export function initGA4() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (!measurementId || measurementId === 'G-XXXXXXXXXX') {
    return;
  }

  // Check if already initialized
  if (globalThis.gtag) {
    return;
  }

  // Initialize dataLayer for GA4
  globalThis.dataLayer = globalThis.dataLayer || [];
  globalThis.gtag = function() {
    globalThis.dataLayer.push(arguments);
  };
  globalThis.gtag('js', new Date());
  globalThis.gtag('config', measurementId, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure'
  });

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

// Track custom events (works with both GTM and GA4)
export function trackEvent(eventName, eventParams = {}) {
  // GA4 event tracking
  if (globalThis.gtag) {
    globalThis.gtag('event', eventName, eventParams);
  }
  
  // GTM dataLayer push
  if (globalThis.dataLayer) {
    globalThis.dataLayer.push({
      event: eventName,
      ...eventParams
    });
  }
}

// Track page views (for SPAs)
export function trackPageView(pagePath, pageTitle) {
  // GA4 page view
  if (globalThis.gtag) {
    globalThis.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
  
  // GTM dataLayer push
  if (globalThis.dataLayer) {
    globalThis.dataLayer.push({
      event: 'page_view',
      page_path: pagePath,
      page_title: pageTitle
    });
  }
}

// Set user properties
export function setUserProperties(properties) {
  if (globalThis.gtag) {
    globalThis.gtag('set', 'user_properties', properties);
  }
}

// Track conversions/goals
export function trackConversion(conversionName, conversionValue = null) {
  const params = conversionValue ? { value: conversionValue } : {};
  
  if (globalThis.gtag) {
    globalThis.gtag('event', 'conversion', {
      send_to: conversionName,
      ...params
    });
  }
}

// E-commerce tracking (if needed later)
export function trackPurchase(transactionData) {
  if (globalThis.gtag) {
    globalThis.gtag('event', 'purchase', transactionData);
  }
  
  if (globalThis.dataLayer) {
    globalThis.dataLayer.push({
      event: 'purchase',
      ecommerce: transactionData
    });
  }
}

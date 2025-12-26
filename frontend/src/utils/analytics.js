// Google Tag Manager Integration

export function initGTM() {
  const gtmId = import.meta.env.VITE_GTM_ID;
  
  if (!gtmId || gtmId === 'GTM-XXXXXXX') {
    console.log('Google Tag Manager not initialized - no container ID configured');
    return;
  }

  // Check if already initialized
  if (window.dataLayer) {
    console.log('Google Tag Manager already initialized');
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });

  // Load GTM script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  document.head.appendChild(script);

  console.log('Google Tag Manager initialized with ID:', gtmId);
}

// Google Analytics 4 Integration

export function initGA4() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (!measurementId || measurementId === 'G-XXXXXXXXXX') {
    console.log('Google Analytics not initialized - no measurement ID configured');
    return;
  }

  // Check if already initialized
  if (window.gtag) {
    console.log('Google Analytics already initialized');
    return;
  }

  // Initialize dataLayer for GA4
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure'
  });

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  console.log('Google Analytics initialized with ID:', measurementId);
}

// Track custom events (works with both GTM and GA4)
export function trackEvent(eventName, eventParams = {}) {
  // GA4 event tracking
  if (window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
  
  // GTM dataLayer push
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventParams
    });
  }
}

// Track page views (for SPAs)
export function trackPageView(pagePath, pageTitle) {
  // GA4 page view
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
  
  // GTM dataLayer push
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: pagePath,
      page_title: pageTitle
    });
  }
}

// Set user properties
export function setUserProperties(properties) {
  if (window.gtag) {
    window.gtag('set', 'user_properties', properties);
  }
}

// Track conversions/goals
export function trackConversion(conversionName, conversionValue = null) {
  const params = conversionValue ? { value: conversionValue } : {};
  
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: conversionName,
      ...params
    });
  }
}

// E-commerce tracking (if needed later)
export function trackPurchase(transactionData) {
  if (window.gtag) {
    window.gtag('event', 'purchase', transactionData);
  }
  
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: transactionData
    });
  }
}

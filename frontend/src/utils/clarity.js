// Microsoft Clarity Analytics Integration

export function initClarity() {
  const clarityId = import.meta.env.VITE_CLARITY_ID;
  
  // Only initialize if Clarity ID is provided and not in development mode
  if (!clarityId || clarityId === 'your_clarity_project_id') {
    return;
  }

  // Check if already initialized
  if (globalThis.clarity) {
    return;
  }

  // Initialize Clarity
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(globalThis, document, "clarity", "script", clarityId);
}

// Track custom events (optional)
export function trackEvent(eventName, eventData = {}) {
  if (globalThis.clarity) {
    globalThis.clarity('event', eventName, eventData);
  }
}

// Set custom tags (optional)
export function setTag(key, value) {
  if (globalThis.clarity) {
    globalThis.clarity('set', key, value);
  }
}

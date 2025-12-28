// Microsoft Clarity Analytics Integration

export function initClarity() {
  const clarityId = import.meta.env.VITE_CLARITY_ID;
  
  // Only initialize if Clarity ID is provided and not in development mode
  if (!clarityId || clarityId === 'your_clarity_project_id') {
    return;
  }

  // Check if already initialized
  if (window.clarity) {
    return;
  }

  // Initialize Clarity
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", clarityId);
}

// Track custom events (optional)
export function trackEvent(eventName, eventData = {}) {
  if (window.clarity) {
    window.clarity('event', eventName, eventData);
  }
}

// Set custom tags (optional)
export function setTag(key, value) {
  if (window.clarity) {
    window.clarity('set', key, value);
  }
}

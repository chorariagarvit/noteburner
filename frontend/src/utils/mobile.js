/**
 * Mobile-First Responsive Utilities
 * 
 * Breakpoints:
 * - Mobile: 0-640px (sm)
 * - Tablet: 641-1024px (md-lg)
 * - Desktop: 1025px+ (xl)
 */

// Detect mobile device
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Detect iOS
export const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Detect Android
export const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
};

// Check if device has touch support
export const hasTouchSupport = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Get safe area insets (for notched devices)
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10)
  };
};

// Vibrate device (haptic feedback)
export const vibrate = (pattern = 200) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// Check screen orientation
export const getOrientation = () => {
  if (typeof window === 'undefined') return 'portrait';
  if (window.matchMedia('(orientation: portrait)').matches) {
    return 'portrait';
  }
  return 'landscape';
};

// Lock orientation (PWA only)
export const lockOrientation = async (orientation = 'portrait') => {
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock(orientation);
      return true;
    }
  } catch (error) {
    console.error('Failed to lock orientation:', error);
  }
  return false;
};

// Unlock orientation
export const unlockOrientation = () => {
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch (error) {
    console.error('Failed to unlock orientation:', error);
  }
};

// Prevent zoom on input focus (mobile)
export const preventZoomOnFocus = () => {
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta && isMobile()) {
    const originalContent = viewportMeta.content;
    
    const disableZoom = () => {
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    };
    
    const enableZoom = () => {
      viewportMeta.content = originalContent;
    };
    
    // Disable zoom on input focus, enable after blur
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        disableZoom();
      }
    });
    
    document.addEventListener('focusout', () => {
      setTimeout(enableZoom, 300);
    });
  }
};

// Get device pixel ratio (for high-DPI displays)
export const getPixelRatio = () => {
  return window.devicePixelRatio || 1;
};

// Check if device is in standalone mode (installed PWA)
export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Request fullscreen (PWA)
export const requestFullscreen = async () => {
  const elem = document.documentElement;
  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    }
    return true;
  } catch (error) {
    console.error('Fullscreen request failed:', error);
    return false;
  }
};

// Exit fullscreen
export const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  } catch (error) {
    console.error('Exit fullscreen failed:', error);
  }
};

// Get network connection info
export const getNetworkInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    return {
      effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
      downlink: connection.downlink, // Mbps
      rtt: connection.rtt, // ms
      saveData: connection.saveData // boolean
    };
  }
  return null;
};

// Smooth scroll to element (mobile-optimized)
export const smoothScrollTo = (element, offset = 0) => {
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
};

export default {
  isMobile,
  isIOS,
  isAndroid,
  hasTouchSupport,
  getSafeAreaInsets,
  vibrate,
  getOrientation,
  lockOrientation,
  unlockOrientation,
  preventZoomOnFocus,
  getPixelRatio,
  isStandalone,
  requestFullscreen,
  exitFullscreen,
  getNetworkInfo,
  smoothScrollTo
};

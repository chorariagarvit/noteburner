import { sessionStore } from './storage';
import { translate, detectLocale } from './i18n';

// PWA installation and service worker registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      // Check for updates every hour
      setInterval(() => {
        registration.update().catch(() => { /* offline: retry at the next interval */ });
      }, 60 * 60 * 1000);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            showUpdateNotification();
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// A new version has installed. The service worker already took over, so this only offers to reload the page
// to use it: a quiet banner (not a blocking pop-up), announced to screen readers, shown at most once per session.
const UPDATE_SHOWN_KEY = 'noteburner_update_notice_shown';

const showUpdateNotification = () => {
  if (sessionStore.get(UPDATE_SHOWN_KEY)) return;
  sessionStore.set(UPDATE_SHOWN_KEY, '1');

  const locale = detectLocale();
  const banner = document.createElement('div');
  banner.setAttribute('role', 'status');
  banner.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-xl shadow-2xl ' +
    'bg-gray-900 text-white dark:bg-white dark:text-gray-900 max-w-[calc(100%-2rem)]';

  const text = document.createElement('span');
  text.className = 'text-sm';
  text.textContent = translate(locale, 'pwa.updateAvailable');

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'px-3 py-1 rounded-lg text-sm font-semibold bg-primary-700 text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
  reload.textContent = translate(locale, 'pwa.reload');
  reload.addEventListener('click', () => window.location.reload());

  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'px-3 py-1 rounded-lg text-sm font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600';
  later.textContent = translate(locale, 'pwa.later');
  later.addEventListener('click', () => banner.remove());

  banner.append(text, reload, later);
  document.body.append(banner);
};

// Check if PWA is installable
export const checkInstallability = () => {
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install button
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'block';
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          deferredPrompt = null;
          installBtn.style.display = 'none';
        }
      });
    }
  });
  
  // Detect if app is installed
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    // Track installation
    if (window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'engagement'
      });
    }
  });
};

// Check if running as PWA
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Send push notification
export const sendNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  }
  return null;
};

// Check online/offline status.
// Only notifies on real transitions: "online" fires only after a previously-reported
// offline state (never on first load), and rapid flapping is debounced.
export const setupOnlineStatusDetection = (onOnline, onOffline) => {
  let lastReported = navigator.onLine ? 'online' : 'offline';
  let timer = null;

  // Initial state: only surface "offline" (nothing to announce when already online)
  if (lastReported === 'offline' && onOffline) onOffline();

  const handleChange = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const current = navigator.onLine ? 'online' : 'offline';
      if (current === lastReported) return;
      lastReported = current;
      if (current === 'online') {
        if (onOnline) onOnline();
      } else if (onOffline) {
        onOffline();
      }
    }, 1500);
  };

  window.addEventListener('online', handleChange);
  window.addEventListener('offline', handleChange);

  return () => {
    clearTimeout(timer);
    window.removeEventListener('online', handleChange);
    window.removeEventListener('offline', handleChange);
  };
};

// Background sync for offline actions
export const registerBackgroundSync = async (tag) => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await registration.sync.register(tag);
      return true;
    } catch (error) {
      console.error('[PWA] Background sync registration failed:', error);
      return false;
    }
  }
  return false;
};

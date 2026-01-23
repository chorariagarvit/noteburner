import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initClarity } from './utils/clarity';
import { initGTM, initGA4 } from './utils/analytics';
import { registerServiceWorker, checkInstallability, setupOnlineStatusDetection } from './utils/pwa';

// Initialize analytics (only if IDs are configured)
initGTM();        // Google Tag Manager
initGA4();        // Google Analytics 4
initClarity();    // Microsoft Clarity

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  registerServiceWorker().then((registration) => {
    if (registration) {
      console.log('[PWA] Service Worker registered');
    }
  });
}

// Check PWA installability
checkInstallability();

// Setup online/offline status detection
setupOnlineStatusDetection(
  () => {
    console.log('[PWA] Back online');
    // Show reconnected notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = '✓ Back online';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  },
  () => {
    console.log('[PWA] Offline');
    // Show offline notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = '⚠ You are offline';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

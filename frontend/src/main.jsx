import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initClarity } from './utils/clarity';
import { initGTM, initGA4 } from './utils/analytics';
import { installApiAuth } from './utils/apiBase';
import { registerServiceWorker, checkInstallability, setupOnlineStatusDetection } from './utils/pwa';
import { detectLocale, loadLocale } from './utils/i18n';

// Attach signed app token to all API calls (must run before any fetch)
installApiAuth();

// Initialize analytics (only if IDs are configured)
initGTM();        // Google Tag Manager
initGA4();        // Google Analytics 4
initClarity();    // Microsoft Clarity

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  registerServiceWorker().catch((error) => console.warn('[PWA] Service Worker registration failed:', error));
}

// Check PWA installability
checkInstallability();

// A short notice in a corner that screen readers announce (role="status"); it removes itself after 3 seconds
function showNotice(text, colorClass) {
  const notice = document.createElement('div');
  notice.setAttribute('role', 'status');
  notice.className = `fixed top-4 right-4 ${colorClass} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
  notice.textContent = text;
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 3000);
}

// Setup online/offline status detection
setupOnlineStatusDetection(
  () => showNotice('✓ Back online', 'bg-green-600'),
  () => showNotice('⚠ You are offline', 'bg-orange-700')
);

// Start from the visitor's own language, so the first paint is not English text that then switches
const render = () => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
loadLocale(detectLocale()).catch(() => { /* offline: English is bundled */ }).finally(render);

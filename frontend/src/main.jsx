import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initClarity } from './utils/clarity';
import { initGTM, initGA4 } from './utils/analytics';

// Initialize analytics (only if IDs are configured)
initGTM();        // Google Tag Manager
initGA4();        // Google Analytics 4
initClarity();    // Microsoft Clarity

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

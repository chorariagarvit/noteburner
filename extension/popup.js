// Popup script for NoteBurner extension

// DOM Elements
const messageInput = document.getElementById('messageInput');
const passwordInput = document.getElementById('passwordInput');
const expiresInSelect = document.getElementById('expiresIn');
const generatePasswordBtn = document.getElementById('generatePassword');
const createBtn = document.getElementById('createBtn');
const selectedTextSection = document.getElementById('selectedTextSection');
const selectedPreview = document.getElementById('selectedPreview');
const encryptSelectedBtn = document.getElementById('encryptSelectedBtn');
const resultSection = document.getElementById('resultSection');
const resultUrl = document.getElementById('resultUrl');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

let currentShareUrl = '';

// Colour scheme: follows the system by default; the button cycles System, Light and Dark (see theme.js)
const schemeToggle = document.getElementById('darkModeToggle');
const schemeIcon = document.querySelector('.dark-mode-icon');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
let colorScheme = 'system';

function applyColorScheme() {
  document.body.classList.toggle('dark-mode', isDarkScheme(colorScheme, systemDark.matches));
  schemeIcon.textContent = COLOR_SCHEME_ICONS[colorScheme];
  const label = `Theme: ${COLOR_SCHEME_LABELS[colorScheme]}. Press to change.`;
  schemeToggle.setAttribute('aria-label', label);
  schemeToggle.title = label;
}

// Match the system straight away (no flash for the default), then apply the saved choice
applyColorScheme();
chrome.storage.sync.get(['colorScheme', 'darkMode'], (result) => {
  colorScheme = readColorScheme(result);
  applyColorScheme();
});

// The system changed (for example at sunset) while the popup is open
systemDark.addEventListener('change', applyColorScheme);

schemeToggle.addEventListener('click', () => {
  colorScheme = nextColorScheme(colorScheme);
  applyColorScheme();
  chrome.storage.sync.set({ colorScheme });
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check if there's selected text in the active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      // Read the selection only now, from the tab the user is on (activeTab grants this
      // for the click that opened the popup). Nothing runs on pages the user does not use us on.
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => String(window.getSelection() || '')
      });
      const text = injection && injection.result;
      if (text && text.trim()) {
        selectedPreview.textContent = text;
        selectedTextSection.classList.remove('hidden');
        messageInput.value = text;
      }
    }
  } catch (error) {
    console.log('No selection available on this page:', error && error.message); // chrome:// pages, the web store, etc.
  }
});

// Generate password
generatePasswordBtn.addEventListener('click', () => {
  const password = generatePassword(16);
  passwordInput.type = 'text';
  passwordInput.value = password;
  
  // Copy to clipboard
  void navigator.clipboard.writeText(password).catch(() => { /* clipboard unavailable */ });
  
  // Show feedback
  generatePasswordBtn.textContent = '✅';
  setTimeout(() => {
    generatePasswordBtn.textContent = '🎲';
  }, 1500);
});

// Encrypt selected text
encryptSelectedBtn.addEventListener('click', () => {
  const text = selectedPreview.textContent;
  messageInput.value = text;
  
  // Scroll to password input if empty
  if (!passwordInput.value) {
    passwordInput.focus();
  }
  
  // Hide selected text section to show main form
  selectedTextSection.classList.add('hidden');
  
  // If password exists, proceed with creation
  if (passwordInput.value && passwordInput.value.length >= 8) {
    void handleCreateMessage();
  }
});

// Create message
createBtn.addEventListener('click', () => {
  void handleCreateMessage();
});

// Handle Enter key in message input
messageInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    void handleCreateMessage();
  }
});

// Create message handler
async function handleCreateMessage() {
  const message = messageInput.value.trim();
  const password = passwordInput.value;
  const expiresIn = expiresInSelect.value;
  
  // Validate
  if (!message) {
    showError('Message cannot be empty');
    return;
  }
  
  if (!password) {
    showError('Password is required');
    return;
  }
  
  if (password.length < 8) {
    showError('Password must be at least 8 characters');
    return;
  }
  
  // Hide sections
  hideAllSections();
  loadingSection.classList.remove('hidden');
  
  try {
    // Create secure message
    const result = await createSecureMessage(message, password, expiresIn);
    
    // Show result
    currentShareUrl = result.url;
    resultUrl.textContent = result.url;
    
    hideAllSections();
    resultSection.classList.remove('hidden');
    
  } catch (error) {
    if (error.code === 'CHALLENGE_REQUIRED') {
      // The server wants a Cloudflare Turnstile check, which only works on a web page: finish on the site
      chrome.tabs.create({ url: `https://noteburner.work/create#text=${encodeURIComponent(message)}` });
    }
    showError(error.message || 'Failed to create message');
  }
}

// Copy link
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentShareUrl);
    copyBtn.textContent = '✅ Copied!';
    
    setTimeout(() => {
      copyBtn.textContent = '📋 Copy Link';
    }, 2000);
  } catch {
    // Intentionally not logged: the failure is reported to the caller/user below
    showError('Failed to copy link');
  }
});

// Open in NoteBurner
openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: currentShareUrl });
  window.close();
});

// Utility functions
function hideAllSections() {
  selectedTextSection.classList.add('hidden');
  resultSection.classList.add('hidden');
  loadingSection.classList.add('hidden');
  errorSection.classList.add('hidden');
}

function showError(message) {
  hideAllSections();
  errorMessage.textContent = message;
  errorSection.classList.remove('hidden');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    errorSection.classList.add('hidden');
  }, 3000);
}

// Reset to initial state when message input changes
messageInput.addEventListener('input', () => {
  if (resultSection.classList.contains('hidden') === false) {
    hideAllSections();
  }
});

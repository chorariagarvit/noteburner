// Background service worker for NoteBurner extension

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'noteburner-encrypt',
    title: 'Send via NoteBurner',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'noteburner-encrypt') {
    const selectedText = info.selectionText;

    if (selectedText) {
      const encodedText = encodeURIComponent(selectedText);
      // Open NoteBurner with pre-filled message
      // Use correct domain noteburner.work
      const url = `https://noteburner.work/create?text=${encodedText}`;
      chrome.tabs.create({ url });
    }
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    // Request selected text from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelection' })
          .then((response) => {
            sendResponse(response);
          })
          .catch((error) => {
            // Content script not available
            console.log('Content script not available:', error);
            sendResponse({ text: '' });
          });
      } else {
        sendResponse({ text: '' });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'openNoteBurner') {
    // Open NoteBurner in new tab with encrypted message
    const url = request.url || 'https://noteburner.work/create';
    chrome.tabs.create({ url });
  }

  if (request.action === 'showNotification') {
    // Show browser notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: request.title || 'NoteBurner',
      message: request.message
    });
  }
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Open popup (handled automatically by action.default_popup)
});

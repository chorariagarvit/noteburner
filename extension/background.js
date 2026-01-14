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
    
    // Send selected text to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'encryptText',
      text: selectedText
    });
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    // Request selected text from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelection' }, (response) => {
          sendResponse(response);
        });
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

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
      const url = `https://noteburner.work/create#text=${encodedText}`;
      chrome.tabs.create({ url });
    }
  }
});

// Handle messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openNoteBurner') {
    // Open NoteBurner in new tab with encrypted message
    const url = request.url || 'https://noteburner.work/create';
    chrome.tabs.create({ url });
  }
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Open popup (handled automatically by action.default_popup)
});

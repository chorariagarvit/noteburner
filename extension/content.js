// Content script for NoteBurner extension

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // encryptText handled by background script now

  if (request.action === 'getSelection') {
    const selectedText = window.getSelection().toString();
    sendResponse({ text: selectedText });
  }

  return true; // Keep message channel open
});

// Optional: Add floating action button for quick access
let floatingButton = null;

function createFloatingButton() {
  if (floatingButton) return;

  floatingButton = document.createElement('div');
  floatingButton.id = 'noteburner-fab';
  floatingButton.innerHTML = '🔥';
  floatingButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    font-size: 24px;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    z-index: 999999;
    transition: all 0.3s ease;
  `;

  floatingButton.addEventListener('mouseenter', () => {
    floatingButton.style.transform = 'scale(1.1)';
    floatingButton.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.5)';
  });

  floatingButton.addEventListener('mouseleave', () => {
    floatingButton.style.transform = 'scale(1)';
    floatingButton.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
  });

  floatingButton.addEventListener('click', () => {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      const encodedText = encodeURIComponent(selectedText);
      window.open(`https://noteburner.work/create?text=${encodedText}`, '_blank');
    } else {
      window.open('https://noteburner.work/create', '_blank');
    }
  });

  document.body.appendChild(floatingButton);
}

// Show floating button when text is selected
document.addEventListener('selectionchange', () => {
  const selectedText = window.getSelection().toString();

  if (!floatingButton) {
    createFloatingButton();
  }

  if (selectedText && selectedText.length > 0) {
    floatingButton.style.display = 'flex';
  } else {
    floatingButton.style.display = 'none';
  }
});

// Initialize
createFloatingButton();

import { useEffect, useCallback } from 'react';

/**
 * Custom hook for handling keyboard shortcuts
 * @param {Object} shortcuts - Map of key combinations to callbacks
 * @param {boolean} enabled - Whether shortcuts are enabled
 * 
 * Example:
 * useKeyboardShortcuts({
 *   'ctrl+Enter': handleSubmit,
 *   'Escape': handleClose,
 *   'ctrl+k': handleSearch
 * }, true);
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Build the key combination string
    const keys = [];
    if (event.ctrlKey || event.metaKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    
    // Get the actual key
    const key = event.key.toLowerCase();
    if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
      keys.push(key);
    }

    const combination = keys.join('+');

    // Check if this combination has a handler
    if (shortcuts[combination]) {
      event.preventDefault();
      shortcuts[combination](event);
    }

    // Also check for just the key (like 'Escape')
    if (shortcuts[event.key]) {
      event.preventDefault();
      shortcuts[event.key](event);
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for handling form submission with Ctrl/Cmd+Enter
 * @param {Function} onSubmit - Submit callback
 * @param {boolean} enabled - Whether shortcut is enabled
 */
export function useSubmitShortcut(onSubmit, enabled = true) {
  useKeyboardShortcuts({
    'ctrl+enter': onSubmit,
    'meta+enter': onSubmit
  }, enabled);
}

/**
 * Hook for handling modal/dialog close with Escape
 * @param {Function} onClose - Close callback
 * @param {boolean} enabled - Whether shortcut is enabled
 */
export function useEscapeKey(onClose, enabled = true) {
  useKeyboardShortcuts({
    'Escape': onClose
  }, enabled);
}

export default useKeyboardShortcuts;

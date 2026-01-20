import { X, Command, Keyboard } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

const SHORTCUTS = [
  {
    category: 'General',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], mac: ['⌘', 'Enter'], description: 'Submit form / Send message' },
      { keys: ['Esc'], mac: ['Esc'], description: 'Close modal or dialog' },
      { keys: ['?'], mac: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Tab'], mac: ['Tab'], description: 'Navigate between fields' }
    ]
  },
  {
    category: 'Message Creation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], mac: ['⌘', 'K'], description: 'Focus message field' },
      { keys: ['Ctrl', 'P'], mac: ['⌘', 'P'], description: 'Focus password field' },
      { keys: ['Ctrl', 'G'], mac: ['⌘', 'G'], description: 'Generate password' },
      { keys: ['Ctrl', 'U'], mac: ['⌘', 'U'], description: 'Focus custom URL field' }
    ]
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['Ctrl', 'C'], mac: ['⌘', 'C'], description: 'Copy share URL (on success page)' },
      { keys: ['Ctrl', 'N'], mac: ['⌘', 'N'], description: 'Create new message' },
      { keys: ['Ctrl', 'S'], mac: ['⌘', 'S'], description: 'Create similar message' }
    ]
  }
];

function KeyboardShortcutsModal({ isOpen, onClose }) {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      aria-describedby="shortcuts-description"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Keyboard className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <h2 id="shortcuts-title" className="text-xl font-bold text-gray-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close keyboard shortcuts modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <p id="shortcuts-description" className="sr-only">
            List of available keyboard shortcuts for NoteBurner
          </p>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Command className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {isMac ? 'Use ⌘ (Command) key for shortcuts' : 'Use Ctrl key for shortcuts'}
              </p>
            </div>
          </div>

          <div className="space-y-6" role="list" aria-label="Keyboard shortcut categories">
            {SHORTCUTS.map((category) => (
              <div key={category.category} role="listitem">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                  {category.category}
                </h3>
                <div className="space-y-2" role="list" aria-label={`${category.category} shortcuts`}>
                  {category.shortcuts.map((shortcut, index) => {
                    const keys = isMac ? shortcut.mac : shortcut.keys;
                    return (
                      <div
                        key={index}
                        role="listitem"
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-gray-700 dark:text-gray-200">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1" aria-label={`Press ${keys.join(' + ')}`}>
                          {keys.map((key, keyIndex) => (
                            <span key={keyIndex} className="flex items-center gap-1">
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                                {key}
                              </kbd>
                              {keyIndex < keys.length - 1 && (
                                <span className="text-gray-400" aria-hidden="true">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">?</kbd> anytime to view this help
          </p>
        </div>
      </div>
    </div>
  );
}

KeyboardShortcutsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default KeyboardShortcutsModal;

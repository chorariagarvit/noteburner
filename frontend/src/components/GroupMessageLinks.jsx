import { useState } from 'react';
import { Copy, Check, Users, Link2, Clock, Shield } from 'lucide-react';
import PropTypes from 'prop-types';

export function GroupMessageLinks({ groupData }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = async (url, index) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatExpiration = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = timestamp - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Less than 1 hour';
  };

  return (
    <div className="space-y-6">
      {/* Group Info Card */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-lg border-2 border-primary-200 dark:border-primary-700">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Group Message Created!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {groupData.recipientCount} unique link{groupData.recipientCount > 1 ? 's' : ''} generated
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Clock className="w-4 h-4" />
              Expiration
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formatExpiration(groupData.expiresAt)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Shield className="w-4 h-4" />
              Burn Mode
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {groupData.burnOnFirstView ? 'All on first view' : 'Individual'}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Link2 className="w-4 h-4" />
              Max Views
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {groupData.maxViews || 'Unlimited'}
            </div>
          </div>
        </div>

        {groupData.burnOnFirstView && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <strong>Warning:</strong> All links will burn after the first recipient opens the message
            </p>
          </div>
        )}
      </div>

      {/* Recipient Links */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          Recipient Links
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Share each link with a different recipient. Each link works only once.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {groupData.links.map((link, index) => (
            <div
              key={link.token}
              className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipient #{link.recipientIndex}
                  </div>
                  <div className="text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 break-all">
                    {link.url}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(link.url, index)}
                  className="flex-shrink-0 px-3 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  aria-label={`Copy link for recipient ${link.recipientIndex}`}
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Tips</h5>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Each link is unique and can only be used once</li>
          <li>• Share links separately to maintain security</li>
          <li>• Recipients will need the same password to decrypt</li>
          <li>• Consider using different passwords for each recipient for maximum security</li>
        </ul>
      </div>
    </div>
  );
}

GroupMessageLinks.propTypes = {
  groupData: PropTypes.shape({
    groupId: PropTypes.string.isRequired,
    recipientCount: PropTypes.number.isRequired,
    links: PropTypes.arrayOf(PropTypes.shape({
      recipientIndex: PropTypes.number.isRequired,
      token: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired
    })).isRequired,
    expiresAt: PropTypes.number,
    burnOnFirstView: PropTypes.bool,
    maxViews: PropTypes.number
  }).isRequired
};

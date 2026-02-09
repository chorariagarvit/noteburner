import React, { useState, useEffect } from 'react';

/**
 * Audit Log Viewer
 * Shows privacy-friendly access logs for message creators
 */
const AuditLogViewer = ({ messageId, creatorToken }) => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [messageId, creatorToken]);

  const fetchAuditLogs = async () => {
    if (!messageId || !creatorToken) return;

    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/audit/${messageId}`, {
        headers: {
          'X-Creator-Token': creatorToken
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setAuditData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300">❌ {error}</p>
      </div>
    );
  }

  if (!auditData) return null;

  const { message, events } = auditData;

  const getEventIcon = (type) => {
    switch (type) {
      case 'created':
        return '✨';
      case 'viewed':
        return '👁️';
      case 'burned':
        return '🔥';
      case 'password_attempt':
        return '🔑';
      case 'password_failed':
        return '❌';
      default:
        return '📝';
    }
  };

  const getEventColor = (type, success) => {
    if (type === 'burned') return 'text-orange-600 dark:text-orange-400';
    if (type === 'password_failed' || !success) return 'text-red-600 dark:text-red-400';
    if (type === 'viewed') return 'text-green-600 dark:text-green-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Message Activity Log
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Privacy-friendly access tracking (country-level geo data only)
        </p>
      </div>

      {/* Message stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {message.view_count} / {message.max_views === -1 ? '∞' : message.max_views}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Views
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {message.password_attempts}
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            Password Attempts
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatTimestamp(message.created_at)}
          </div>
          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
            Created
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {formatTimestamp(message.expires_at)}
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
            Expires
          </div>
        </div>
      </div>

      {/* Event timeline */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Activity Timeline
        </h4>
        
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No activity recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">
                  {getEventIcon(event.type)}
                </span>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getEventColor(event.type, event.success)}`}>
                      {event.type.replace('_', ' ').charAt(0).toUpperCase() + event.type.slice(1).replace('_', ' ')}
                    </span>
                    {event.country && event.country !== 'UNKNOWN' && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                        {getFlagEmoji(event.country)} {event.country}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTimestamp(event.timestamp)}
                  </div>

                  {event.metadata && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {event.metadata.reason && `Reason: ${event.metadata.reason}`}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {event.success ? (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">🔒 Privacy First</p>
            <p className="text-xs">
              We only log country-level location (no IPs, no cities). 
              Audit logs are automatically deleted 30 days after message expiration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to get flag emoji from country code
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode === 'UNKNOWN') return '🌍';
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  
  return String.fromCodePoint(...codePoints);
}

export default AuditLogViewer;

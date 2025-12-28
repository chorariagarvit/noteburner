import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Clock, AlertCircle } from 'lucide-react';

/**
 * Calculate time remaining until expiration
 * @param {string} expiresAt - ISO timestamp
 * @returns {Object} Time remaining in various units
 */
function calculateTimeRemaining(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry - now;

  if (diff <= 0) {
    return { expired: true, total: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    expired: false,
    total: diff,
    hours,
    minutes,
    seconds
  };
}

/**
 * Format time remaining as human-readable string
 * @param {Object} timeRemaining - Time object from calculateTimeRemaining
 * @returns {string} Formatted time string
 */
function formatTimeRemaining(timeRemaining) {
  if (timeRemaining.expired) {
    return 'Expired';
  }

  const { hours, minutes, seconds } = timeRemaining;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export function CountdownTimer({ expiresAt, onExpire }) {
  const [timeRemaining, setTimeRemaining] = useState(() => calculateTimeRemaining(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = calculateTimeRemaining(expiresAt);
      setTimeRemaining(newTime);

      if (newTime.expired && onExpire) {
        onExpire();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeRemaining.expired) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
        <AlertCircle className="h-5 w-5" />
        <span>Message Expired</span>
      </div>
    );
  }

  // Calculate progress percentage (24 hours = 100%)
  const totalDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const progress = (timeRemaining.total / totalDuration) * 100;

  // Determine urgency level
  const isUrgent = timeRemaining.total < 60 * 60 * 1000; // Less than 1 hour
  const isCritical = timeRemaining.total < 15 * 60 * 1000; // Less than 15 minutes

  const urgencyColor = isCritical 
    ? 'text-red-600 dark:text-red-400' 
    : isUrgent 
    ? 'text-orange-600 dark:text-orange-400' 
    : 'text-gray-700 dark:text-gray-300';

  const progressColor = isCritical
    ? 'bg-red-500'
    : isUrgent
    ? 'bg-orange-500'
    : 'bg-blue-500';

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 font-mono text-lg ${urgencyColor}`}>
        <Clock className={`h-5 w-5 ${isCritical ? 'animate-pulse' : ''}`} />
        <span>{formatTimeRemaining(timeRemaining)}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all duration-1000 ease-linear`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>

      {/* Urgency message */}
      {isUrgent && (
        <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {isCritical ? 'Hurry! Message expires very soon!' : 'Message expires in less than an hour!'}
        </p>
      )}
    </div>
  );
}

CountdownTimer.propTypes = {
  expiresAt: PropTypes.string.isRequired,
  onExpire: PropTypes.func
};

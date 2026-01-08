import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import confetti from 'canvas-confetti';

export default function AchievementUnlocked({ achievement, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);
    
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347']
    });
    
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div 
        className={`
          max-w-md w-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 
          border-2 border-yellow-500/50 rounded-lg p-6 shadow-2xl shadow-yellow-500/30
          transform transition-all duration-300 pointer-events-auto
          ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}
        `}
      >
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">
            {achievement.icon}
          </div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">
            Achievement Unlocked!
          </h2>
          <h3 className="text-xl font-semibold text-white mb-2">
            {achievement.title}
          </h3>
          <p className="text-gray-300">
            {achievement.description}
          </p>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="mt-6 px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors"
          >
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}

AchievementUnlocked.propTypes = {
  achievement: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

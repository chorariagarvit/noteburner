import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Gift, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RewardUnlocked({ reward, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for animation
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-8 transform transition-all duration-300 ${
          visible ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
            <Gift className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          🎉 Reward Unlocked!
        </h2>

        {/* Reward Info */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{reward.icon}</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {reward.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {reward.description}
          </p>
        </div>

        {/* Call to action */}
        <div className="space-y-2">
          <Link
            to="/referrals"
            className="btn-primary w-full text-center flex items-center justify-center gap-2"
          >
            <Gift className="w-5 h-5" />
            View All Rewards
          </Link>
          <button
            onClick={handleClose}
            className="btn-secondary w-full"
          >
            Continue
          </button>
        </div>

        {/* Confetti effect (optional - can add later) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            >
              <span className="text-2xl">
                {['🎉', '✨', '🎊', '⭐'][Math.floor(Math.random() * 4)]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

RewardUnlocked.propTypes = {
  reward: PropTypes.shape({
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    reward: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

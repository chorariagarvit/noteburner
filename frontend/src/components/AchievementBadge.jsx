import React from 'react';
import PropTypes from 'prop-types';
import { useI18n } from '../contexts/I18nContext';

export default function AchievementBadge({ achievement, unlocked = false, progress = null }) {
  const { t } = useI18n();
  return (
    <div 
      className={`
        relative p-4 rounded-lg border-2 transition-all
        ${unlocked 
          ? 'bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-500/20 dark:to-orange-500/20 border-yellow-400 dark:border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
          : 'bg-white dark:bg-gray-800/50 border-gray-300 dark:border-gray-700/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`text-4xl ${unlocked ? 'animate-bounce' : 'grayscale opacity-60'}`}>
          {achievement.icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-bold ${unlocked ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-400'}`}>
            {achievement.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {achievement.description}
          </p>
          {!unlocked && progress && progress.percentage > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-500 mb-1">
                <span>{t('achievementBadge.progress')}</span>
                <span>{Math.round(progress.percentage)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {unlocked && (
        <div className="absolute top-2 right-2">
          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            {t('achievementBadge.unlocked')}
          </div>
        </div>
      )}
    </div>
  );
}

AchievementBadge.propTypes = {
  achievement: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired
  }).isRequired,
  unlocked: PropTypes.bool,
  progress: PropTypes.shape({
    percentage: PropTypes.number,
    current: PropTypes.number,
    target: PropTypes.number
  })
};

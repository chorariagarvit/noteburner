import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp } from 'lucide-react';
import AchievementBadge from '../components/AchievementBadge';
import StreakCounter from '../components/StreakCounter';
import { getUserStats, getAchievementProgress } from '../utils/achievements';
import { useI18n } from '../contexts/I18nContext';

export default function AchievementsPage() {
  const { t } = useI18n();
  const stats = getUserStats();
  const progress = getAchievementProgress();
  const unlocked = progress.filter(p => p.unlocked);
  const locked = progress.filter(p => !p.unlocked);
  
  useEffect(() => {
    document.title = 'NoteBurner - Achievements';
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 mb-4 shadow-lg">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('achievements.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('achievements.subtitle')}
          </p>
          <div className="mt-4">
            <StreakCounter />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.messagesCreated}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('achievements.statMessages')}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {unlocked.length}/{progress.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('achievements.statAchievements')}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {stats.currentStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('achievements.statStreak')}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.filesUploaded}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('achievements.statFiles')}
            </div>
          </div>
        </div>

        {/* Unlocked Achievements */}
        {unlocked.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {t('achievements.unlockedTitle').replace('{count}', unlocked.length)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlocked.map(({ achievement }) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {locked.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-gray-500" />
              {t('achievements.inProgressTitle').replace('{count}', locked.length)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locked.map((item) => (
                <AchievementBadge
                  key={item.achievement.id}
                  achievement={item.achievement}
                  unlocked={false}
                  progress={item}
                />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            to="/create"
            className="btn-primary inline-flex items-center gap-2"
          >
            {t('achievements.createCta')}
          </Link>
        </div>
      </div>
    </div>
  );
}

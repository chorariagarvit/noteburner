import React from 'react';
import { getUserStats } from '../utils/achievements';

export default function StreakCounter() {
  const stats = getUserStats();
  const streak = stats.currentStreak || 0;
  
  if (streak === 0) return null;
  
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-full">
      <span className="text-2xl animate-pulse">🔥</span>
      <div className="text-left">
        <div className="text-sm font-bold text-orange-400">
          {streak} Day Streak!
        </div>
        <div className="text-xs text-gray-400">
          Keep it going
        </div>
      </div>
    </div>
  );
}

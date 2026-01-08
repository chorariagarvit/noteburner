import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Flame, Shield, Clock } from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    document.title = 'NoteBurner - Leaderboard';
    fetchLeaderboard();
  }, []);
  
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading leaderboard...</p>
        </div>
      </div>
    );
  }
  
  const stats = leaderboardData || {};
  
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 mb-4 shadow-lg">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Global Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Anonymous platform statistics - Privacy first, always
          </p>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-blue-500 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Today
              </h3>
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Messages Created</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.today?.messages_created || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Messages Burned</span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.today?.messages_burned || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-purple-500 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                This Week
              </h3>
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Messages Created</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.this_week?.messages_created || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Messages Burned</span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.this_week?.messages_burned || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-green-500 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                All Time
              </h3>
              <Trophy className="w-6 h-6 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Messages Created</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.all_time?.messages_created?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Messages Burned</span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.all_time?.messages_burned?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-500" />
            Platform Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                {stats.all_time?.files_encrypted?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Files Encrypted</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {stats.all_time?.avg_file_size 
                  ? `${(stats.all_time.avg_file_size / (1024 * 1024)).toFixed(1)}MB`
                  : '0MB'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg File Size</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                {stats.all_time?.messages_burned && stats.all_time?.messages_created
                  ? `${((stats.all_time.messages_burned / stats.all_time.messages_created) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Burn Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                100%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Privacy Protected</div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-2 flex items-center justify-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy First
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            All statistics are completely anonymous. We track platform usage, not individual users.
            No personal information is collected or stored. Ever.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Gift, Copy, Check, TrendingUp, Lock, Unlock } from 'lucide-react';
import { 
  getReferralStats, 
  getReferralUrl, 
  getNextReward,
  getUnlockedRewards 
} from '../utils/referrals';

export default function ReferralsPage() {
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [referralUrl, setReferralUrl] = useState('');
  const [nextReward, setNextReward] = useState(null);
  const [unlockedRewards, setUnlockedRewards] = useState([]);

  useEffect(() => {
    document.title = 'NoteBurner - Referrals & Rewards';
    loadStats();
  }, []);

  const loadStats = () => {
    const referralStats = getReferralStats();
    const url = getReferralUrl();
    const next = getNextReward();
    const unlocked = getUnlockedRewards();
    
    setStats(referralStats);
    setReferralUrl(url);
    setNextReward(next);
    setUnlockedRewards(unlocked);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!stats) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Gift className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Referrals & Rewards
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Create messages to unlock exclusive features
          </p>
        </div>

        {/* Current Progress */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Progress
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {stats.messagesCreated} message{stats.messagesCreated !== 1 ? 's' : ''} created
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                {unlockedRewards.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Rewards Unlocked
              </div>
            </div>
          </div>

          {nextReward && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Next Reward: {nextReward.title}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {nextReward.progress} / {nextReward.threshold}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${nextReward.percentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {nextReward.threshold - nextReward.progress} more message{nextReward.threshold - nextReward.progress !== 1 ? 's' : ''} to unlock
              </p>
            </div>
          )}
        </div>

        {/* Share Referral Link */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Share NoteBurner
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Share your unique referral link to help others discover secure messaging!
          </p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={referralUrl}
              readOnly
              className="input-field font-mono text-sm flex-1"
            />
            <button
              onClick={handleCopy}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Your Referral Code:</strong> <code className="font-mono">{stats.referralCode}</code>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              All rewards are earned by creating messages - no referrals required! 🎉
            </p>
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            All Rewards
          </h2>

          {Object.values(stats.rewards).map((reward) => (
            <div
              key={reward.reward}
              className={`card ${
                reward.unlocked
                  ? 'border-2 border-green-500 dark:border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                  : 'opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{reward.icon}</div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {reward.title}
                    </h3>
                    {reward.unlocked ? (
                      <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    {reward.description}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                      reward.unlocked
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {reward.unlocked ? 'Unlocked!' : `${reward.threshold} messages required`}
                    </span>
                    
                    {!reward.unlocked && stats.messagesCreated > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round((stats.messagesCreated / reward.threshold) * 100)}% complete
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="card mt-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700">
          <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-2">
            How It Works
          </h3>
          <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-1">
            <li>✅ Create encrypted messages to earn rewards</li>
            <li>✅ All rewards are automatically unlocked when you reach the threshold</li>
            <li>✅ No server tracking - everything is stored locally in your browser</li>
            <li>✅ Privacy-first: your referral code is just for sharing, not tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

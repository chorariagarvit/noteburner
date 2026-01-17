// Referral system - Privacy-first, localStorage-based
// No server tracking, all rewards are client-side

const REFERRAL_STORAGE_KEY = 'noteburner_referral_stats';
const REFERRAL_CODE_KEY = 'noteburner_referral_code';

// Rewards tiers
export const REWARDS = {
  MESSAGES_5: {
    threshold: 5,
    reward: 'file_limit_100mb',
    title: 'Increased File Limit',
    description: 'Upload files up to 100MB',
    icon: '📁',
    unlocked: false
  },
  MESSAGES_10: {
    threshold: 10,
    reward: 'custom_expiration',
    title: 'Custom Expiration',
    description: 'Set expiration down to minutes',
    icon: '⏰',
    unlocked: false
  },
  MESSAGES_25: {
    threshold: 25,
    reward: 'priority_support',
    title: 'Priority Badge',
    description: 'Show your NoteBurner supporter status',
    icon: '⭐',
    unlocked: false
  }
};

/**
 * Get or create user's referral code
 */
export function getReferralCode() {
  let code = localStorage.getItem(REFERRAL_CODE_KEY);
  
  if (!code) {
    // Generate a random 6-character code
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem(REFERRAL_CODE_KEY, code);
  }
  
  return code;
}

/**
 * Get referral stats
 */
export function getReferralStats() {
  const saved = localStorage.getItem(REFERRAL_STORAGE_KEY);
  
  if (!saved) {
    return {
      messagesCreated: 0,
      referralCode: getReferralCode(),
      rewards: { ...REWARDS },
      referredBy: null,
      joinedAt: Date.now()
    };
  }
  
  const stats = JSON.parse(saved);
  
  // Ensure rewards structure is up to date
  if (!stats.rewards) {
    stats.rewards = { ...REWARDS };
  }
  
  return stats;
}

/**
 * Save referral stats
 */
function saveReferralStats(stats) {
  localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(stats));
}

/**
 * Check if a reward should be unlocked
 */
function checkRewardUnlock(stats) {
  const newlyUnlocked = [];
  
  Object.entries(stats.rewards).forEach(([key, reward]) => {
    if (!reward.unlocked && stats.messagesCreated >= reward.threshold) {
      stats.rewards[key].unlocked = true;
      newlyUnlocked.push(reward);
    }
  });
  
  return newlyUnlocked;
}

/**
 * Increment message count and check for reward unlocks
 */
export function incrementReferralProgress() {
  const stats = getReferralStats();
  stats.messagesCreated += 1;
  
  const newRewards = checkRewardUnlock(stats);
  saveReferralStats(stats);
  
  return {
    stats,
    newRewards
  };
}

/**
 * Set referral code if user came from a referral link
 * This is privacy-preserving - we don't track who referred whom on the server
 */
export function setReferredBy(referralCode) {
  const stats = getReferralStats();
  
  // Only set if not already set
  if (!stats.referredBy && referralCode && referralCode !== stats.referralCode) {
    stats.referredBy = referralCode;
    stats.joinedAt = Date.now();
    saveReferralStats(stats);
    return true;
  }
  
  return false;
}

/**
 * Check if a specific reward is unlocked
 */
export function isRewardUnlocked(rewardKey) {
  const stats = getReferralStats();
  return stats.rewards[rewardKey]?.unlocked || false;
}

/**
 * Get referral URL for sharing
 */
export function getReferralUrl() {
  const code = getReferralCode();
  const baseUrl = globalThis.location?.origin || 'https://noteburner.work';
  return `${baseUrl}?ref=${code}`;
}

/**
 * Get progress towards next reward
 */
export function getNextReward() {
  const stats = getReferralStats();
  
  // Find the next locked reward
  const nextReward = Object.values(stats.rewards)
    .filter(r => !r.unlocked)
    .sort((a, b) => a.threshold - b.threshold)[0];
  
  if (!nextReward) {
    return null; // All rewards unlocked
  }
  
  return {
    ...nextReward,
    progress: stats.messagesCreated,
    percentage: Math.min(100, (stats.messagesCreated / nextReward.threshold) * 100)
  };
}

/**
 * Get all unlocked rewards
 */
export function getUnlockedRewards() {
  const stats = getReferralStats();
  return Object.values(stats.rewards).filter(r => r.unlocked);
}

/**
 * Check if user has increased file limit
 */
export function hasIncreasedFileLimit() {
  return isRewardUnlocked('MESSAGES_5');
}

/**
 * Get max file size based on rewards
 */
export function getMaxFileSize() {
  // Default: 50MB (as per original design)
  // With referral reward: 100MB
  return hasIncreasedFileLimit() ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
}

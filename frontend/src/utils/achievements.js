// Achievement definitions
export const ACHIEVEMENTS = {
  FIRST_BURN: {
    id: 'first_burn',
    title: 'First Burn',
    description: 'Created your first self-destructing message',
    icon: '🔥',
    requirement: (stats) => stats.messagesCreated >= 1
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Sent 10 messages in a single day',
    icon: '⚡',
    requirement: (stats) => stats.messagesToday >= 10
  },
  SECURITY_EXPERT: {
    id: 'security_expert',
    title: 'Security Expert',
    description: 'Used maximum expiration settings (7 days)',
    icon: '🛡️',
    requirement: (stats) => stats.maxExpirationUsed
  },
  FILE_MASTER: {
    id: 'file_master',
    title: 'File Master',
    description: 'Uploaded a file larger than 50MB',
    icon: '📁',
    requirement: (stats) => stats.largestFileSize >= 50 * 1024 * 1024
  },
  CENTURION: {
    id: 'centurion',
    title: 'Centurion',
    description: 'Created 100 messages',
    icon: '💯',
    requirement: (stats) => stats.messagesCreated >= 100
  },
  NIGHT_OWL: {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Sent a message between midnight and 5 AM',
    icon: '🦉',
    requirement: (stats) => stats.nightMessage
  },
  STREAK_MASTER: {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Maintained a 7-day streak',
    icon: '🔥',
    requirement: (stats) => stats.currentStreak >= 7
  },
  MYSTERY_SENDER: {
    id: 'mystery_sender',
    title: 'Mystery Sender',
    description: 'Sent an anonymous mystery message',
    icon: '🎭',
    requirement: (stats) => stats.mysteryMessages >= 1
  }
};

// Get user stats from localStorage
export function getUserStats() {
  const saved = localStorage.getItem('noteburner_stats');
  if (!saved) {
    return {
      messagesCreated: 0,
      messagesToday: 0,
      messagesThisWeek: 0,
      filesUploaded: 0,
      largestFileSize: 0,
      maxExpirationUsed: false,
      nightMessage: false,
      currentStreak: 0,
      lastMessageDate: null,
      mysteryMessages: 0,
      achievements: []
    };
  }
  return JSON.parse(saved);
}

// Save user stats to localStorage
export function saveUserStats(stats) {
  localStorage.setItem('noteburner_stats', JSON.stringify(stats));
}

// Update stats after creating a message
export function updateStatsOnMessageCreate(options = {}) {
  const stats = getUserStats();
  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours();
  
  // Increment message counters
  stats.messagesCreated += 1;
  
  // Check if same day for daily counter
  if (stats.lastMessageDate === today) {
    stats.messagesToday += 1;
  } else {
    stats.messagesToday = 1;
  }
  
  // Update streak
  if (stats.lastMessageDate) {
    const lastDate = new Date(stats.lastMessageDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      stats.currentStreak += 1;
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
  }
  
  stats.lastMessageDate = today;
  
  // Track file upload
  if (options.fileSize) {
    stats.filesUploaded += 1;
    if (options.fileSize > stats.largestFileSize) {
      stats.largestFileSize = options.fileSize;
    }
  }
  
  // Track max expiration usage
  if (options.expiration === 604800000) { // 7 days in ms
    stats.maxExpirationUsed = true;
  }
  
  // Track night messages (midnight to 5 AM)
  if (hour >= 0 && hour < 5) {
    stats.nightMessage = true;
  }
  
  // Track mystery messages
  if (options.mysteryMode) {
    stats.mysteryMessages += 1;
  }
  
  // Check for new achievements
  const newAchievements = checkAchievements(stats);
  
  saveUserStats(stats);
  
  return newAchievements;
}

// Check which achievements have been unlocked
export function checkAchievements(stats) {
  const newAchievements = [];
  
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (!stats.achievements.includes(achievement.id) && achievement.requirement(stats)) {
      stats.achievements.push(achievement.id);
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
}

// Get all unlocked achievements
export function getUnlockedAchievements() {
  const stats = getUserStats();
  return stats.achievements.map(id => 
    Object.values(ACHIEVEMENTS).find(a => a.id === id)
  ).filter(Boolean);
}

// Get progress towards locked achievements
export function getAchievementProgress() {
  const stats = getUserStats();
  const progress = [];
  
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (!stats.achievements.includes(achievement.id)) {
      let percentage = 0;
      let current = 0;
      let target = 0;
      
      // Calculate progress based on achievement type
      if (achievement.id === 'first_burn') {
        current = stats.messagesCreated;
        target = 1;
        percentage = Math.min(100, (current / target) * 100);
      } else if (achievement.id === 'speed_demon') {
        current = stats.messagesToday;
        target = 10;
        percentage = Math.min(100, (current / target) * 100);
      } else if (achievement.id === 'centurion') {
        current = stats.messagesCreated;
        target = 100;
        percentage = Math.min(100, (current / target) * 100);
      } else if (achievement.id === 'file_master') {
        current = stats.largestFileSize;
        target = 50 * 1024 * 1024;
        percentage = Math.min(100, (current / target) * 100);
      } else if (achievement.id === 'streak_master') {
        current = stats.currentStreak;
        target = 7;
        percentage = Math.min(100, (current / target) * 100);
      }
      
      progress.push({
        achievement,
        percentage,
        current,
        target,
        unlocked: false
      });
    } else {
      progress.push({
        achievement,
        percentage: 100,
        unlocked: true
      });
    }
  });
  
  return progress;
}

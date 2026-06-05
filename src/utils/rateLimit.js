const jsonStore = require('../storage/jsonStore');
const { getLocalISODate } = require('./format');
const { getSettings } = require('../config/configManager');

// Simple in-memory rate limiting for 'per minute' check
const memoryStore = new Map();

async function checkRateLimit(telegramId) {
  const settings = getSettings();
  const now = Date.now();
  const oneMinuteMs = 60 * 1000;
  
  if (settings.security.enableRateLimit) {
    // 1. Check per-minute rate limit (in-memory)
    if (!memoryStore.has(telegramId)) {
      memoryStore.set(telegramId, { count: 1, lastTime: now });
    } else {
      const userLimit = memoryStore.get(telegramId);
      if (now - userLimit.lastTime < oneMinuteMs) {
        if (userLimit.count >= settings.security.maxRequestPerMinute) {
          return { allowed: false, reason: 'TOO_FAST', message: 'Terlalu banyak request. Coba lagi beberapa saat.' };
        }
        userLimit.count += 1;
      } else {
        userLimit.count = 1;
        userLimit.lastTime = now;
      }
    }
  }

  // 2. Check daily limit from JSON
  let user = await jsonStore.findById('users.json', 'telegram_id', String(telegramId));
  
  if (!user) {
    // Should theoretically not happen if /start is enforced, but safe check
    return { allowed: false, reason: 'NOT_FOUND', message: 'Akun belum terdaftar. Silakan kirim /start terlebih dahulu.' };
  }

  const today = getLocalISODate();
  
  // Reset daily limit if it's a new day
  if (user.last_request_date !== today) {
    await jsonStore.updateJson('users.json', (data) => {
      const u = data.find(item => item.telegram_id === String(telegramId));
      if (u) {
        u.request_today = 0;
        u.last_request_date = today;
      }
      return data;
    });
    // refresh user object
    user = await jsonStore.findById('users.json', 'telegram_id', String(telegramId));
  }

  const dailyLimit = user.daily_limit !== undefined ? user.daily_limit : settings.bot.userDailyLimit;

  if (user.request_today >= dailyLimit) {
    return { allowed: false, reason: 'LIMIT_EXCEEDED', message: 'Limit harian kamu sudah habis. Silakan coba lagi besok.' };
  }

  return { allowed: true };
}

// Memory cleanup interval
setInterval(() => {
  const now = Date.now();
  const oneMinuteMs = 60 * 1000;
  for (const [key, value] of memoryStore.entries()) {
    if (now - value.lastTime > oneMinuteMs) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 mins

module.exports = {
  checkRateLimit
};

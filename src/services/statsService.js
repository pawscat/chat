const jsonStore = require('../storage/jsonStore');
const { getLocalISODate, getLocalISOMonth } = require('../utils/format');

async function recordUserRequest(telegramId) {
  const today = getLocalISODate();
  
  await jsonStore.updateJson('users.json', (data) => {
    const user = data.find(u => u.telegram_id === String(telegramId));
    if (user) {
      user.total_request += 1;
      user.request_today += 1;
      user.last_active = new Date().toISOString();
    }
    return data;
  });

  await jsonStore.updateJson('usage.json', (data) => {
    if (data.date !== today) {
      data.date = today;
      data.today_requests = 0;
    }
    const currentMonth = getLocalISOMonth();
    if (data.month !== currentMonth) {
      data.month = currentMonth;
      data.monthly_requests = 0;
    }

    data.total_requests += 1;
    data.today_requests += 1;
    data.monthly_requests += 1;

    // Keep only last 50 recent requests
    data.recent_requests.unshift({
      telegram_id: String(telegramId),
      timestamp: new Date().toISOString()
    });
    if (data.recent_requests.length > 50) {
      data.recent_requests.pop();
    }

    return data;
  });
}

async function recordApiUsage(success, telegramId, responseTimeMs, errorMessage = null) {
  const today = getLocalISODate();
  const currentMonth = getLocalISOMonth();

  await jsonStore.updateJson('api_usage.json', (data) => {
    if (data.date !== today) {
      data.date = today;
      data.today_requests = 0;
    }
    if (data.month !== currentMonth) {
      data.month = currentMonth;
      data.monthly_requests = 0;
    }

    data.total_requests += 1;
    data.today_requests += 1;
    data.monthly_requests += 1;

    if (success) {
      data.success_requests += 1;
      
      // Calculate moving average for response time
      if (data.average_response_time_ms === 0) {
        data.average_response_time_ms = responseTimeMs;
      } else {
        // Simple moving average weight
        data.average_response_time_ms = Math.round((data.average_response_time_ms * 0.9) + (responseTimeMs * 0.1));
      }
    } else {
      data.failed_requests += 1;
      data.last_error = {
        message: errorMessage,
        timestamp: new Date().toISOString()
      };
    }

    // Per user stats
    const tId = String(telegramId);
    if (!data.per_user[tId]) {
      data.per_user[tId] = 0;
    }
    data.per_user[tId] += 1;

    return data;
  });
}

async function updateUserActive(telegramId) {
  await jsonStore.updateJson('users.json', (data) => {
    const user = data.find(u => u.telegram_id === String(telegramId));
    if (user) {
      user.last_active = new Date().toISOString();
    }
    return data;
  });
}

async function updateGroupActive(chatId) {
  await jsonStore.updateJson('groups.json', (data) => {
    const group = data.find(g => g.chat_id === String(chatId));
    if (group) {
      group.last_active = new Date().toISOString();
      group.status = 'active'; // Mark as active if it sent a message
    }
    return data;
  });
}

async function updateChannelActive(chatId) {
  await jsonStore.updateJson('channels.json', (data) => {
    const channel = data.find(c => c.chat_id === String(chatId));
    if (channel) {
      channel.last_active = new Date().toISOString();
      channel.status = 'active';
    }
    return data;
  });
}

module.exports = {
  recordUserRequest,
  recordApiUsage,
  updateUserActive,
  updateGroupActive,
  updateChannelActive
};

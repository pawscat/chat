const jsonStore = require('../storage/jsonStore');
const { getAdminMainKeyboard, getBroadcastTargetKeyboard, getBroadcastConfirmKeyboard, getSettingsKeyboard } = require('./keyboards');
const { getServerStats } = require('../services/serverMonitor');

async function showAdminDashboard(ctx, isEdit = false) {
  const users = await jsonStore.readJson('users.json');
  const groups = await jsonStore.readJson('groups.json');
  const channels = await jsonStore.readJson('channels.json');
  const apiUsage = await jsonStore.readJson('api_usage.json');
  const serverStats = getServerStats();

  const activeUsers = users.filter(u => u.status === 'active').length;
  const activeGroups = groups.filter(g => g.status === 'active').length;
  const activeChannels = channels.filter(c => c.status === 'active').length;

  const text = `📊 *Dashboard Admin Bot*

👤 User Aktif: ${activeUsers} / ${users.length}
👥 Grup Aktif: ${activeGroups} / ${groups.length}
📢 Channel Aktif: ${activeChannels} / ${channels.length}
🤖 Request Hari Ini: ${apiUsage.today_requests}
🔑 API Bulan Ini: ${apiUsage.monthly_requests} / ${apiUsage.success_requests + apiUsage.failed_requests}
⏱ Uptime: ${serverStats.os.uptime}
💾 RAM: ${serverStats.ram.used} / ${serverStats.ram.total}
📡 Ping: ${serverStats.ping}`;

  if (isEdit) {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...getAdminMainKeyboard()
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...getAdminMainKeyboard()
    });
  }
}

async function handleAdminAction(ctx) {
  const action = ctx.match[0];
  
  if (action === 'admin_close') {
    await ctx.deleteMessage();
    return;
  }

  if (action === 'admin_main') {
    await showAdminDashboard(ctx, true);
    return;
  }

  if (action === 'admin_server') {
    const stats = getServerStats();
    const text = `🖥 *Cek Server*
    
*RAM:*
Total: ${stats.ram.total}
Used: ${stats.ram.used} (${stats.ram.percent}%)
Free: ${stats.ram.free}

*CPU Load:*
1m: ${stats.cpu.load1m}
5m: ${stats.cpu.load5m}
15m: ${stats.cpu.load15m}

*System:*
OS: ${stats.os.platform} ${stats.os.arch}
Uptime: ${stats.os.uptime}
Node: ${stats.process.version}
Process Uptime: ${stats.process.uptime}
Ping Internal: ${stats.ping}`;

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]]
      }
    });
  }

  if (action === 'admin_users') {
    const users = await jsonStore.readJson('users.json');
    const text = `👤 *Data User*\nTotal User: ${users.length}\nActive: ${users.filter(u=>u.status==='active').length}\nBlacklisted: ${users.filter(u=>u.is_blacklisted).length}`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]] } });
  }

  if (action === 'admin_groups') {
    const groups = await jsonStore.readJson('groups.json');
    const text = `👥 *Data Grup*\nTotal Grup: ${groups.length}\nActive: ${groups.filter(g=>g.status==='active').length}`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]] } });
  }

  if (action === 'admin_channels') {
    const channels = await jsonStore.readJson('channels.json');
    const text = `📢 *Data Channel*\nTotal Channel: ${channels.length}\nActive: ${channels.filter(c=>c.status==='active').length}`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]] } });
  }

  if (action === 'admin_api') {
    const api = await jsonStore.readJson('api_usage.json');
    const text = `🔑 *API Usage*\n\nTotal: ${api.total_requests}\nSuccess: ${api.success_requests}\nFailed: ${api.failed_requests}\n\nHari ini: ${api.today_requests}\nBulan ini: ${api.monthly_requests}\n\nAvg Response Time: ${api.average_response_time_ms} ms\nLast Error: ${api.last_error ? api.last_error.message : '-'}`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]] } });
  }

  if (action === 'admin_logs') {
    const logs = await jsonStore.readJson('logs.json');
    const recentLogs = logs.slice(-5).map(l => `[${l.type}] ${l.message}`).join('\n');
    const text = `📜 *5 Log Terakhir*\n\n${recentLogs || 'Tidak ada log.'}`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]] } });
  }

  if (action === 'admin_settings') {
    const { getSettings } = require('../config/configManager');
    const settings = getSettings();
    const text = `⚙ *Settings*`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...getSettingsKeyboard(settings) });
  }

  if (action === 'admin_admins') {
    const admins = await jsonStore.readJson('admins.json');
    const list = admins.map(a => `- ${a.username || a.telegram_id} (${a.role})`).join('\n');
    const text = `🛡 *Kelola Admin*\n\n${list}\n\n_Untuk mengelola admin lebih detail, silakan gunakan Web Dashboard._`;
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]] } });
  }

  if (action.startsWith('toggle_')) {
    const settingKey = action.replace('toggle_', '');
    
    const configManager = require('../config/configManager');
    const currentSettings = JSON.parse(JSON.stringify(configManager.getSettings())); // deep copy
    
    if (settingKey === 'maintenance') {
      currentSettings.bot.maintenanceMode = !currentSettings.bot.maintenanceMode;
    } else if (settingKey === 'private_ai') {
      currentSettings.bot.allowPrivateAi = !currentSettings.bot.allowPrivateAi;
    } else if (settingKey === 'group_ai') {
      currentSettings.bot.allowGroupAi = !currentSettings.bot.allowGroupAi;
    }
    
    try {
      await configManager.updateSettings(currentSettings, `telegram_admin_${ctx.from.id}`);
      await ctx.editMessageReplyMarkup(getSettingsKeyboard(configManager.getSettings()).reply_markup);
    } catch (e) {
      await ctx.answerCbQuery("Gagal update setting!");
    }
  }
}

module.exports = {
  showAdminDashboard,
  handleAdminAction
};

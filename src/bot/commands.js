const jsonStore = require('../storage/jsonStore');
const { getAdminMainKeyboard } = require('./keyboards');
const { isAdminActive } = require('../services/authService');
const { getLocalISODate } = require('../utils/format');

function registerCommands(bot) {
  bot.command('start', async (ctx) => {
    const user = ctx.from;
    const { getSettings } = require('../config/configManager');
    const settings = getSettings();
    
    await jsonStore.updateJson('users.json', (data) => {
      const existing = data.find(u => u.telegram_id === String(user.id));
      if (!existing) {
        data.push({
          telegram_id: String(user.id),
          username: user.username || null,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          language_code: user.language_code || null,
          type: 'private',
          status: 'active',
          is_blacklisted: false,
          daily_limit: settings.bot.userDailyLimit,
          total_request: 0,
          request_today: 0,
          last_request_date: getLocalISODate(),
          registered_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        });
      } else {
        existing.last_active = new Date().toISOString();
        if (user.username) existing.username = user.username;
        if (user.first_name) existing.first_name = user.first_name;
      }
      return data;
    });

    const webUrl = settings.web.baseUrl || 'http://localhost:3000';
    const msg = `${settings.bot.welcomeMessage}\n\nID Telegram Anda: \`${user.id}\`\n\nAnda dapat login ke dashboard web untuk melihat statistik: ${webUrl}/user/login`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('help', async (ctx) => {
    const msg = `*Cara Menggunakan Bot ini:*\n\n` +
      `- *Chat Biasa (Private):* Kirimkan pesan apa saja, bot akan membalas menggunakan AI.\n` +
      `- *Di Grup:* Tambahkan bot ke grup. Untuk memanggil bot, gunakan perintah /ai <pertanyaan> atau mention bot.\n` +
      `- /id - Menampilkan Telegram ID Anda.\n` +
      `- /stats - Menampilkan statistik penggunaan Anda.\n` +
      `- /ping - Cek status bot.`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('id', async (ctx) => {
    const msg = `*Informasi Anda:*\nID Telegram: \`${ctx.from.id}\`\nUsername: @${ctx.from.username || '-'}`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('stats', async (ctx) => {
    const users = await jsonStore.readJson('users.json');
    const user = users.find(u => u.telegram_id === String(ctx.from.id));
    
    if (!user) {
      await ctx.reply("Akun Anda belum terdaftar. Silakan kirim /start.");
      return;
    }

    const { formatDate } = require('../utils/format');
    const { getSettings } = require('../config/configManager');
    const settings = getSettings();
    const dailyLimit = user.daily_limit !== undefined ? user.daily_limit : settings.bot.userDailyLimit;
    const sisaLimit = Math.max(0, dailyLimit - user.request_today);

    const msg = `*Statistik Pribadi Anda:*\n\n` +
      `📅 Tanggal Daftar: ${formatDate(user.registered_at)}\n` +
      `⏱ Terakhir Aktif: ${formatDate(user.last_active)}\n` +
      `🤖 Total Request: ${user.total_request}\n` +
      `📈 Request Hari Ini: ${user.request_today}\n` +
      `🔒 Limit Harian: ${dailyLimit}\n` +
      `✅ Sisa Limit: ${sisaLimit}\n` +
      `📌 Status Akun: ${user.status.toUpperCase()}`;

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('ping', async (ctx) => {
    const start = performance.now();
    const msg = await ctx.reply('Pinging...');
    const end = performance.now();
    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `Pong! 🏓 ${(end - start).toFixed(2)}ms`);
  });

  bot.command('admin', async (ctx) => {
    const telegramId = ctx.from.id;
    const isAdmin = await isAdminActive(telegramId);
    
    if (!isAdmin) {
      await ctx.reply("Maaf, kamu tidak memiliki akses admin.");
      return;
    }

    const { showAdminDashboard } = require('./adminPanel');
    await showAdminDashboard(ctx);
  });
}

module.exports = {
  registerCommands
};

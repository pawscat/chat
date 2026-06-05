const { askYouApi } = require('../services/youApi');
const { checkRateLimit } = require('../utils/rateLimit');
const jsonStore = require('../storage/jsonStore');
const { recordUserRequest, recordApiUsage } = require('../services/statsService');

async function handleAiRequest(ctx, question) {
  const telegramId = ctx.from.id;
  const chatType = ctx.chat.type;

  // Check Settings
  const { getSettings } = require('../config/configManager');
  const settings = getSettings();
  
  if (settings.bot.maintenanceMode) {
    // Only allow super admin in maintenance mode
    const { isSuperAdmin } = require('../services/authService');
    const isSuper = await isSuperAdmin(telegramId);
    if (!isSuper) {
      await ctx.reply("Sistem sedang dalam mode perbaikan (Maintenance). Silakan coba lagi nanti.");
      return;
    }
  }

  if (chatType === 'private' && !settings.bot.allowPrivateAi) {
    await ctx.reply("Fitur AI di private chat saat ini dinonaktifkan.");
    return;
  }
  if ((chatType === 'group' || chatType === 'supergroup') && !settings.bot.allowGroupAi) {
    await ctx.reply("Fitur AI di grup saat ini dinonaktifkan.");
    return;
  }

  // Check Blacklist
  const blacklist = await jsonStore.readJson('blacklist.json');
  const isBlacklisted = blacklist.find(b => String(b.telegram_id) === String(telegramId));
  if (isBlacklisted) {
    await ctx.reply("Maaf, akun Anda telah diblokir dari penggunaan bot ini.");
    return;
  }

  // Check Rate Limit
  const limitCheck = await checkRateLimit(telegramId);
  if (!limitCheck.allowed) {
    await ctx.reply(limitCheck.message);
    return;
  }

  // API Call
  await ctx.sendChatAction('typing');
  const apiResult = await askYouApi(question);

  if (apiResult.success) {
    // Record stats
    await recordUserRequest(telegramId);
    await recordApiUsage(true, telegramId, apiResult.responseTimeMs);

    // Send answer
    const answer = apiResult.answer;
    
    // Telegram message limit is 4096. We split if it's too long
    const maxLength = settings.bot.maxTelegramMessageLength || 3900;
    if (answer.length > maxLength) {
      const parts = answer.match(new RegExp(`[\\s\\S]{1,${maxLength}}`, 'g')) || [];
      for (const part of parts) {
        await ctx.reply(part);
      }
    } else {
      await ctx.reply(answer);
    }
  } else {
    // Record fail stats
    await recordApiUsage(false, telegramId, apiResult.responseTimeMs, apiResult.errorMessage);
    await ctx.reply(apiResult.answer);
  }
}

module.exports = {
  handleAiRequest
};

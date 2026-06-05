const jsonStore = require('../storage/jsonStore');
const { logError } = require('../services/logService');
const { getBroadcastTargetKeyboard, getBroadcastConfirmKeyboard } = require('./keyboards');
const { TARGETS, BROADCAST_STATUS } = require('../utils/constants');
const { getLocalISODate } = require('../utils/format');

// In-memory state for broadcast setup via Telegram
const broadcastState = new Map();

async function startBroadcastSetup(ctx) {
  const telegramId = ctx.from.id;
  broadcastState.set(telegramId, { step: 'TARGET' });
  await ctx.editMessageText('Pilih target broadcast:', getBroadcastTargetKeyboard());
}

async function handleBroadcastAction(ctx, action) {
  const telegramId = ctx.from.id;
  const state = broadcastState.get(telegramId);

  if (action === 'admin_broadcast') {
    return startBroadcastSetup(ctx);
  }

  if (action.startsWith('bc_target_')) {
    if (!state) return;
    const target = action.replace('bc_target_', '');
    state.target = target;
    state.step = 'MESSAGE';
    await ctx.editMessageText(`Target terpilih: *${target.toUpperCase()}*\n\nSilakan kirim pesan broadcast Anda (teks, foto, dsb) sekarang.`, { parse_mode: 'Markdown' });
  }

  if (action === 'bc_confirm_send') {
    if (!state || state.step !== 'CONFIRM') return;
    
    // Start Broadcast Process
    const broadcastId = `bc_${Date.now()}`;
    const newBroadcast = {
      id: broadcastId,
      admin_id: String(telegramId),
      source: 'telegram',
      target: state.target,
      message: state.messageText,
      total: 0,
      success: 0,
      failed: 0,
      progress: 0,
      status: BROADCAST_STATUS.RUNNING,
      failed_targets: [],
      started_at: new Date().toISOString(),
      finished_at: null
    };

    await jsonStore.pushJson('broadcasts.json', newBroadcast);
    await ctx.editMessageText('Memulai broadcast...');
    
    broadcastState.delete(telegramId);
    
    // Run broadcast asynchronously
    runBroadcast(ctx.telegram, broadcastId, ctx.chat.id, ctx.callbackQuery.message.message_id);
  }

  if (action === 'bc_confirm_cancel') {
    broadcastState.delete(telegramId);
    await ctx.editMessageText('Broadcast dibatalkan.', {
      reply_markup: { inline_keyboard: [[{ text: '🔙 Kembali', callback_data: 'admin_main' }]] }
    });
  }
}

async function handleBroadcastMessage(ctx) {
  const telegramId = ctx.from.id;
  const state = broadcastState.get(telegramId);
  
  if (state && state.step === 'MESSAGE') {
    state.messageText = ctx.message.text || ctx.message.caption || '[Media]';
    // Actually we should store the exact message id to copy or forward, but requirements say "isi pesan" implies text broadcast. 
    // To support complex we'd just use text for now to match web broadcast.
    if (!ctx.message.text) {
      await ctx.reply("Saat ini broadcast via Telegram hanya mendukung teks penuh. Silakan kirim ulang teks.");
      return;
    }
    state.step = 'CONFIRM';
    const preview = `*Preview Broadcast:*\n\nTarget: ${state.target.toUpperCase()}\nPesan:\n${state.messageText}`;
    await ctx.reply(preview, { parse_mode: 'Markdown', ...getBroadcastConfirmKeyboard() });
  }
}

function generateProgressText(bc) {
  const barLength = 15;
  const filledCount = Math.floor((bc.progress / 100) * barLength);
  const bar = '█'.repeat(filledCount) + '░'.repeat(barLength - filledCount);
  const statusStr = bc.status === BROADCAST_STATUS.COMPLETED ? 'Selesai' : (bc.status === BROADCAST_STATUS.FAILED ? 'Gagal' : 'Mengirim...');

  if (bc.status === BROADCAST_STATUS.COMPLETED) {
    const start = new Date(bc.started_at);
    const end = new Date(bc.finished_at);
    const durationSec = Math.floor((end - start) / 1000);
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationStr = `${mins} menit ${secs} detik`;

    return `✅ *Broadcast Selesai*\n\nTarget: ${bc.target}\nTotal Target: ${bc.total}\nBerhasil: ${bc.success}\nGagal: ${bc.failed}\nDurasi: ${durationStr}`;
  }

  return `📢 *Broadcast Berjalan*\n\nTarget: ${bc.target}\nTotal Target: ${bc.total}\nBerhasil: ${bc.success}\nGagal: ${bc.failed}\nDiproses: ${bc.success + bc.failed} / ${bc.total}\nProgress: ${bc.progress}%\n\n${bar} ${bc.progress}%\n\nStatus: ${statusStr}`;
}

async function runBroadcast(telegram, broadcastId, adminChatId = null, adminMessageId = null) {
  try {
    const broadcasts = await jsonStore.readJson('broadcasts.json');
    const bc = broadcasts.find(b => b.id === broadcastId);
    if (!bc) return;

    let targets = [];
    if (bc.target === TARGETS.USERS || bc.target === TARGETS.ALL) {
      const users = await jsonStore.readJson('users.json');
      targets = targets.concat(users.filter(u => u.status === 'active').map(u => ({ id: u.telegram_id, type: 'user' })));
    }
    if (bc.target === TARGETS.GROUPS || bc.target === TARGETS.ALL) {
      const groups = await jsonStore.readJson('groups.json');
      targets = targets.concat(groups.filter(g => g.status === 'active').map(g => ({ id: g.chat_id, type: 'group' })));
    }
    if (bc.target === TARGETS.CHANNELS || bc.target === TARGETS.ALL) {
      const channels = await jsonStore.readJson('channels.json');
      targets = targets.concat(channels.filter(c => c.status === 'active' && c.can_send_message !== false).map(c => ({ id: c.chat_id, type: 'channel' })));
    }

    bc.total = targets.length;
    await updateBroadcast(bc);

    const { getSettings } = require('../config/configManager');
    const settings = getSettings();
    const delayMs = settings.broadcast.delayMs || 700;
    const updateIntervalMs = settings.broadcast.updateIntervalMs || 1000;
    const batchUpdateEvery = settings.broadcast.batchUpdateEvery || 5;

    let processed = 0;
    let lastUpdateTime = Date.now();

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      try {
        await telegram.sendMessage(target.id, bc.message, { parse_mode: 'HTML' });
        bc.success++;
      } catch (err) {
        bc.failed++;
        bc.failed_targets.push({ id: target.id, type: target.type, reason: err.message });
      }

      processed++;
      bc.progress = Math.floor((processed / bc.total) * 100);
      
      const now = Date.now();
      // Update telegram progress based on settings
      if (adminChatId && adminMessageId && settings.broadcast.realtimeProgress && (now - lastUpdateTime >= updateIntervalMs || processed % batchUpdateEvery === 0 || processed === bc.total)) {
        lastUpdateTime = now;
        try {
          await telegram.editMessageText(adminChatId, adminMessageId, null, generateProgressText(bc), { parse_mode: 'Markdown' });
        } catch (e) {
          // Ignore edit error (e.g. message is not modified)
        }
        await updateBroadcast(bc);
      }

      await new Promise(res => setTimeout(res, delayMs));
    }

    bc.status = BROADCAST_STATUS.COMPLETED;
    bc.finished_at = new Date().toISOString();
    await updateBroadcast(bc);

    if (adminChatId && adminMessageId) {
      try {
        await telegram.editMessageText(adminChatId, adminMessageId, null, generateProgressText(bc), { parse_mode: 'Markdown' });
      } catch(e) {}
    }

  } catch (err) {
    await logError('broadcast', `Fatal error running broadcast ${broadcastId}`, err);
    await jsonStore.updateJson('broadcasts.json', (data) => {
      const b = data.find(x => x.id === broadcastId);
      if (b) {
        b.status = BROADCAST_STATUS.FAILED;
        b.finished_at = new Date().toISOString();
      }
      return data;
    });
  }
}

async function updateBroadcast(bcObj) {
  await jsonStore.updateJson('broadcasts.json', (data) => {
    const idx = data.findIndex(x => x.id === bcObj.id);
    if (idx !== -1) {
      data[idx] = bcObj;
    }
    return data;
  });
}

// Function to trigger broadcast from Web
async function startWebBroadcast(adminId, target, messageText, telegramClient) {
  const broadcastId = `bc_${Date.now()}`;
  const newBroadcast = {
    id: broadcastId,
    admin_id: String(adminId),
    source: 'web',
    target: target,
    message: messageText,
    total: 0,
    success: 0,
    failed: 0,
    progress: 0,
    status: BROADCAST_STATUS.RUNNING,
    failed_targets: [],
    started_at: new Date().toISOString(),
    finished_at: null
  };

  await jsonStore.pushJson('broadcasts.json', newBroadcast);
  
  // Background run
  runBroadcast(telegramClient, broadcastId, null, null);
  return broadcastId;
}

module.exports = {
  broadcastState,
  startBroadcastSetup,
  handleBroadcastAction,
  handleBroadcastMessage,
  startWebBroadcast
};

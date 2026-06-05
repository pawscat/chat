const { Markup } = require('telegraf');

function getAdminMainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
    [
      Markup.button.callback('👤 Data User', 'admin_users'),
      Markup.button.callback('👥 Data Grup', 'admin_groups')
    ],
    [
      Markup.button.callback('📢 Data Channel', 'admin_channels'),
      Markup.button.callback('🔑 API Usage', 'admin_api')
    ],
    [
      Markup.button.callback('🖥 Cek Server', 'admin_server'),
      Markup.button.callback('📜 Logs', 'admin_logs')
    ],
    [
      Markup.button.callback('⚙ Settings', 'admin_settings'),
      Markup.button.callback('🛡 Kelola Admin', 'admin_admins')
    ],
    [Markup.button.callback('❌ Tutup Panel', 'admin_close')]
  ]);
}

function getBroadcastTargetKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('👤 Users', 'bc_target_users'),
      Markup.button.callback('👥 Groups', 'bc_target_groups')
    ],
    [
      Markup.button.callback('📢 Channels', 'bc_target_channels'),
      Markup.button.callback('🌍 Semua', 'bc_target_all')
    ],
    [Markup.button.callback('🔙 Kembali', 'admin_main')]
  ]);
}

function getBroadcastConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Kirim Sekarang', 'bc_confirm_send')],
    [Markup.button.callback('❌ Batalkan', 'bc_confirm_cancel')]
  ]);
}

function getSettingsKeyboard(settings) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`Maintenance: ${settings.bot.maintenanceMode ? '✅ ON' : '❌ OFF'}`, 'toggle_maintenance')],
    [Markup.button.callback(`Private AI: ${settings.bot.allowPrivateAi ? '✅ ON' : '❌ OFF'}`, 'toggle_private_ai')],
    [Markup.button.callback(`Group AI: ${settings.bot.allowGroupAi ? '✅ ON' : '❌ OFF'}`, 'toggle_group_ai')],
    [Markup.button.callback('🔙 Kembali', 'admin_main')]
  ]);
}

module.exports = {
  getAdminMainKeyboard,
  getBroadcastTargetKeyboard,
  getBroadcastConfirmKeyboard,
  getSettingsKeyboard
};

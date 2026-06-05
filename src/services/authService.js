const jsonStore = require('../storage/jsonStore');
const { ROLES } = require('../utils/constants');

async function initializeSuperAdmin() {
  const { getSettings } = require('../config/configManager');
  const superAdminId = getSettings().admin.superAdminId;
  if (!superAdminId) return;

  await jsonStore.updateJson('admins.json', (data) => {
    const exists = data.find(a => a.telegram_id === String(superAdminId));
    if (!exists) {
      data.push({
        telegram_id: String(superAdminId),
        username: "superadmin",
        role: ROLES.SUPER_ADMIN,
        permissions: ["all"],
        status: "active",
        created_at: new Date().toISOString(),
        created_by: "system"
      });
      console.log("Super admin initialized.");
    }
    return data;
  });
}

async function getAdmin(telegramIdOrUsername) {
  const admins = await jsonStore.readJson('admins.json');
  return admins.find(a => a.telegram_id === String(telegramIdOrUsername) || a.username === telegramIdOrUsername);
}

async function getUser(telegramIdOrUsername) {
  const users = await jsonStore.readJson('users.json');
  return users.find(u => u.telegram_id === String(telegramIdOrUsername) || u.username === telegramIdOrUsername);
}

async function isAdminActive(telegramId) {
  const admin = await getAdmin(telegramId);
  return admin && admin.status === 'active';
}

async function isSuperAdmin(telegramId) {
  const admin = await getAdmin(telegramId);
  return admin && admin.role === ROLES.SUPER_ADMIN;
}

module.exports = {
  initializeSuperAdmin,
  getAdmin,
  getUser,
  isAdminActive,
  isSuperAdmin
};

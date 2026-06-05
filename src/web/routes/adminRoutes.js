const express = require('express');
const router = express.Router();
const { requireAdmin, requireSuperAdmin } = require('../middleware/authAdmin');
const jsonStore = require('../../storage/jsonStore');
const { escapeHtml } = require('../../utils/validators');
const { getServerStats } = require('../../services/serverMonitor');
const { startWebBroadcast } = require('../../bot/broadcast');
const { ROLES } = require('../../utils/constants');
const bot = require('../../bot/bot');

router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin-login', { error: null, title: 'Admin Login' });
});

router.post('/login', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.render('admin-login', { error: 'Identifier required', title: 'Admin Login' });
  }

  const cleanId = escapeHtml(identifier.trim());
  const admins = await jsonStore.readJson('admins.json');
  const admin = admins.find(a => (a.telegram_id === cleanId || a.username === cleanId) && a.status === 'active');

  if (!admin) {
    return res.render('admin-login', { error: 'Invalid or inactive admin account', title: 'Admin Login' });
  }

  req.session.adminId = admin.telegram_id;
  req.session.adminRole = admin.role;
  res.redirect('/admin/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

router.get('/dashboard', requireAdmin, async (req, res) => {
  const users = await jsonStore.readJson('users.json');
  const groups = await jsonStore.readJson('groups.json');
  const channels = await jsonStore.readJson('channels.json');
  const apiUsage = await jsonStore.readJson('api_usage.json');
  const broadcasts = await jsonStore.readJson('broadcasts.json');
  const { getSettings } = require('../../config/configManager');
  const settings = getSettings();
  const serverStats = getServerStats();

  const activeUsers = users.filter(u => u.status === 'active').length;
  const activeGroups = groups.filter(g => g.status === 'active').length;
  const activeChannels = channels.filter(c => c.status === 'active').length;
  
  const lastBroadcast = broadcasts.length > 0 ? broadcasts[broadcasts.length - 1] : null;

  res.render('admin-dashboard', {
    title: 'Admin Dashboard',
    stats: {
      users: { total: users.length, active: activeUsers },
      groups: { total: groups.length, active: activeGroups },
      channels: { total: channels.length, active: activeChannels },
      api: apiUsage,
      broadcasts: { total: broadcasts.length, last: lastBroadcast },
      server: serverStats,
      settings: settings
    },
    adminRole: req.session.adminRole
  });
});

router.get('/users', requireAdmin, async (req, res) => {
  const users = await jsonStore.readJson('users.json');
  res.render('admin-users', { title: 'Manage Users', users, adminRole: req.session.adminRole });
});

router.get('/groups', requireAdmin, async (req, res) => {
  const groups = await jsonStore.readJson('groups.json');
  res.render('admin-groups', { title: 'Manage Groups', groups, adminRole: req.session.adminRole });
});

router.get('/channels', requireAdmin, async (req, res) => {
  const channels = await jsonStore.readJson('channels.json');
  res.render('admin-channels', { title: 'Manage Channels', channels, adminRole: req.session.adminRole });
});

router.get('/broadcast', requireAdmin, (req, res) => {
  res.render('admin-broadcast', { title: 'Broadcast', adminRole: req.session.adminRole });
});

router.post('/broadcast', requireAdmin, async (req, res) => {
  const { target, message } = req.body;
  if (!target || !message) {
    return res.status(400).json({ error: 'Target and message are required' });
  }

  const broadcastId = await startWebBroadcast(req.session.adminId, target, escapeHtml(message), bot.telegram);
  res.json({ success: true, broadcastId });
});

router.get('/broadcast/status/:id', requireAdmin, async (req, res) => {
  const broadcasts = await jsonStore.readJson('broadcasts.json');
  const bc = broadcasts.find(b => b.id === req.params.id);
  if (!bc) return res.status(404).json({ error: 'Not found' });
  res.json(bc);
});

router.get('/api', requireAdmin, async (req, res) => {
  const apiUsage = await jsonStore.readJson('api_usage.json');
  const { getSettings } = require('../../config/configManager');
  const settings = getSettings();
  res.render('admin-api', { title: 'API Usage', api: apiUsage, settings, adminRole: req.session.adminRole });
});

router.get('/server', requireAdmin, (req, res) => {
  res.render('admin-server', { title: 'Server Status', stats: getServerStats(), adminRole: req.session.adminRole });
});

router.get('/logs', requireAdmin, async (req, res) => {
  const logs = await jsonStore.readJson('logs.json');
  // Reverse to show newest first
  res.render('admin-logs', { title: 'System Logs', logs: logs.reverse().slice(0, 100), adminRole: req.session.adminRole });
});

router.get('/settings', requireAdmin, async (req, res) => {
  const configManager = require('../../config/configManager');
  const settings = configManager.getSettings();
  const configStatus = configManager.getStatus();
  res.render('admin-settings', { title: 'Settings', settings, configStatus, adminRole: req.session.adminRole });
});

router.post('/settings', requireAdmin, async (req, res) => {
  // Only super admin or admin with allowOperatorEditSettings can edit settings.
  // Actually, let's keep it simple and just do it for anyone that reaches here for now, or check allowOperatorEditSettings.
  const configManager = require('../../config/configManager');
  const currentSettings = configManager.getSettings();
  
  if (req.session.adminRole !== ROLES.SUPER_ADMIN && !currentSettings.admin.allowOperatorEditSettings) {
     return res.status(403).send("Operators are not allowed to edit settings.");
  }

  const newSettings = JSON.parse(JSON.stringify(currentSettings)); // Deep clone
  
  // Extract fields from req.body mapping to the settings.js object
  try {
    // telegram
    if (req.body.botToken) newSettings.telegram.botToken = req.body.botToken;
    if (req.body.botUsername) newSettings.telegram.botUsername = req.body.botUsername;
    
    // youApi
    if (req.body.youApiKey) newSettings.youApi.apiKey = req.body.youApiKey;
    if (req.body.youApiMode) newSettings.youApi.mode = req.body.youApiMode;
    if (req.body.youApiResearchEndpoint) newSettings.youApi.researchEndpoint = req.body.youApiResearchEndpoint;
    if (req.body.youApiSearchEndpoint) newSettings.youApi.searchEndpoint = req.body.youApiSearchEndpoint;
    if (req.body.youApiTimeoutMs) newSettings.youApi.timeoutMs = parseInt(req.body.youApiTimeoutMs);

    // web
    newSettings.web.enabled = req.body.webEnabled === 'on';
    if (req.body.webPort) newSettings.web.port = parseInt(req.body.webPort);
    if (req.body.webBaseUrl) newSettings.web.baseUrl = req.body.webBaseUrl;
    if (req.body.webSessionSecret && req.body.webSessionSecret !== '********') {
      newSettings.web.sessionSecret = req.body.webSessionSecret;
    }

    // bot
    if (req.body.botName) newSettings.bot.name = req.body.botName;
    if (req.body.botWelcomeMessage) newSettings.bot.welcomeMessage = req.body.botWelcomeMessage;
    newSettings.bot.maintenanceMode = req.body.botMaintenanceMode === 'on';
    newSettings.bot.allowPrivateAi = req.body.botAllowPrivateAi === 'on';
    newSettings.bot.allowGroupAi = req.body.botAllowGroupAi === 'on';
    if (req.body.botUserDailyLimit) newSettings.bot.userDailyLimit = parseInt(req.body.botUserDailyLimit);

    // admin
    newSettings.admin.allowOperatorEditSettings = req.body.adminAllowOperatorEditSettings === 'on';

    await configManager.updateSettings(newSettings, req.session.adminId || 'web_admin');
    res.redirect('/admin/settings');
  } catch (error) {
    res.status(400).send(`Error updating settings: ${error.message}`);
  }
});

router.get('/admins', requireSuperAdmin, async (req, res) => {
  const admins = await jsonStore.readJson('admins.json');
  res.render('admin-admins', { title: 'Manage Admins', admins, adminRole: req.session.adminRole });
});

router.post('/admins/add', requireSuperAdmin, async (req, res) => {
  const { telegram_id, username } = req.body;
  if (!telegram_id) return res.redirect('/admin/admins');

  await jsonStore.updateJson('admins.json', (data) => {
    if (!data.find(a => a.telegram_id === telegram_id)) {
      data.push({
        telegram_id: String(telegram_id),
        username: escapeHtml(username || ''),
        role: ROLES.ADMIN,
        permissions: [],
        status: 'active',
        created_at: new Date().toISOString(),
        created_by: req.session.adminId
      });
    }
    return data;
  });
  res.redirect('/admin/admins');
});

router.post('/admins/remove', requireSuperAdmin, async (req, res) => {
  const { telegram_id } = req.body;
  await jsonStore.updateJson('admins.json', (data) => {
    const idx = data.findIndex(a => a.telegram_id === telegram_id);
    if (idx !== -1 && data[idx].role !== ROLES.SUPER_ADMIN) {
      data.splice(idx, 1);
    }
    return data;
  });
  res.redirect('/admin/admins');
});

module.exports = router;

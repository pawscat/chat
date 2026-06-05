const express = require('express');
const router = express.Router();
const { requireUser } = require('../middleware/authUser');
const jsonStore = require('../../storage/jsonStore');
const { escapeHtml } = require('../../utils/validators');

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/user/dashboard');
  res.render('user-login', { error: null, title: 'User Login' });
});

router.post('/login', async (req, res) => {
  const { identifier } = req.body; // telegram id or username
  if (!identifier) {
    return res.render('user-login', { error: 'Identifier is required', title: 'User Login' });
  }

  const cleanId = escapeHtml(identifier.trim());
  
  const users = await jsonStore.readJson('users.json');
  const user = users.find(u => u.telegram_id === cleanId || u.username === cleanId);

  if (!user) {
    return res.render('user-login', { 
      error: 'Akun belum terdaftar. Silakan buka bot Telegram dan kirim /start terlebih dahulu.',
      title: 'User Login'
    });
  }

  req.session.userId = user.telegram_id;
  res.redirect('/user/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/user/login');
});

router.get('/dashboard', requireUser, async (req, res) => {
  const users = await jsonStore.readJson('users.json');
  const user = users.find(u => u.telegram_id === req.session.userId);
  
  if (!user) {
    req.session.destroy();
    return res.redirect('/user/login');
  }

  const settings = await jsonStore.readJson('settings.json');
  const usage = await jsonStore.readJson('usage.json');

  const recentActivities = usage.recent_requests.filter(r => r.telegram_id === user.telegram_id).slice(0, 10);
  const dailyLimit = user.daily_limit !== undefined ? user.daily_limit : settings.user_daily_limit;

  res.render('user-dashboard', {
    title: 'User Dashboard',
    user,
    dailyLimit,
    recentActivities,
    botUsername: process.env.BOT_USERNAME
  });
});

module.exports = router;

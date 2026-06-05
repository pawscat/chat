const express = require('express');
const session = require('express-session');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { logError } = require('../services/logService');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use((req, res, next) => {
  const { getSettings } = require('../config/configManager');
  const settings = getSettings();
  session({
    secret: settings.web.sessionSecret || 'secret_fallback',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
  })(req, res, next);
});

// Routes
app.get('/', (req, res) => {
  res.redirect('/user/login');
});

app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Global Error Handler for Web
app.use(async (err, req, res, next) => {
  console.error(err.stack);
  await logError('error', `Web Error: ${err.message}`, err);
  res.status(500).send('Something broke!');
});

function startServer() {
  const { getSettings } = require('../config/configManager');
  const settings = getSettings();
  const port = settings.web.port || 3000;
  
  if (!settings.web.enabled) {
    console.log("Web Dashboard is disabled in settings.");
    return Promise.resolve(null);
  }

  // Update session secret dynamically if possible, or just log
  // Normally session secret is set at app init, but we can't easily change it without recreating the app.
  // We'll leave the app.use(session) block as is, but we'll fetch the secret using getSettings.
  
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Web Dashboard is running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

module.exports = {
  startServer
};

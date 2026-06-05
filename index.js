const configManager = require('./src/config/configManager');
const { ensureDataFiles } = require('./src/storage/jsonStore');
const { initBackup } = require('./src/services/backupService');
const { initializeSuperAdmin } = require('./src/services/authService');
const { logError, logInfo } = require('./src/services/logService');
const { createBot } = require('./src/bot/bot');
const webServer = require('./src/web/server');

let botInstance = null;
let serverInstance = null;

async function bootstrap() {
  try {
    console.log("Starting Telegram You AI Bot...");
    
    // 0. Load config initially
    configManager.loadSettings('boot');
    configManager.watchSettingsFile();

    // 1. Ensure Data files
    await ensureDataFiles();

    // 2. Initial Backup
    await initBackup();

    // 3. Init Super Admin
    await initializeSuperAdmin();

    // 4. Start Bot
    startBot();

    // 5. Start Web Server
    startServer();

    // Listen to settings reload
    configManager.on('settingsReloaded', ({ oldSettings, newSettings, source }) => {
      console.log(`[App] Settings reloaded by ${source}. Checking if restarts are needed...`);
      
      // If token changed, restart bot
      if (!oldSettings || oldSettings.telegram.botToken !== newSettings.telegram.botToken) {
        console.log(`[App] Telegram Token changed. Restarting bot...`);
        restartBot();
      }

      // If web port/enabled changed, restart web server
      if (!oldSettings || 
          oldSettings.web.enabled !== newSettings.web.enabled || 
          oldSettings.web.port !== newSettings.web.port) {
        console.log(`[App] Web Server config changed. Restarting server...`);
        restartServer();
      }
    });

  } catch (err) {
    console.error("Bootstrap error:", err);
    process.exit(1);
  }
}

function startBot() {
  if (botInstance) {
    botInstance.stop('Restarting');
  }
  botInstance = createBot();
  botInstance.launch().then(() => {
    console.log("Telegram Bot started.");
    logInfo('info', 'Bot successfully started');
  }).catch(err => {
    console.error("Failed to start bot:", err);
    logError('error', 'Failed to start bot', err);
  });
}

function restartBot() {
  startBot();
}

async function startServer() {
  if (serverInstance) {
    serverInstance.close(() => {
      console.log("Old web server closed.");
      webServer.startServer().then(srv => {
        serverInstance = srv;
      });
    });
  } else {
    serverInstance = await webServer.startServer();
  }
}

function restartServer() {
  startServer();
}

// Global Handlers
process.on('uncaughtException', async (err) => {
  console.error("Uncaught Exception:", err);
  await logError('error', "Uncaught Exception", err);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  await logError('error', "Unhandled Rejection", reason);
});

// Graceful Shutdown
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  logInfo('info', `Received ${signal}. Shutting down gracefully...`);
  
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('Web server closed.');
    });
  }
  
  if (botInstance) {
    botInstance.stop(signal);
  }
  
  setTimeout(() => {
    console.log('Force closing after 5s...');
    process.exit(0);
  }, 5000);
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Go!
bootstrap();

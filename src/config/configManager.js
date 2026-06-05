const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const SETTINGS_PATH = path.resolve(__dirname, '../../settings.js');
const BACKUP_DIR = path.resolve(__dirname, '../../data/backups/settings');

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.currentSettings = null;
    this.watcher = null;
    this.debounceTimer = null;
    this.lastReload = null;
    this.lastReloadSource = null;
    this.lastError = null;

    this.getSettings = this.getSettings.bind(this);
    this.loadSettings = this.loadSettings.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.reloadSettings = this.reloadSettings.bind(this);
    this.watchSettingsFile = this.watchSettingsFile.bind(this);
    this.validateSettings = this.validateSettings.bind(this);
    this.writeSettingsFile = this.writeSettingsFile.bind(this);
    this.backupSettingsFile = this.backupSettingsFile.bind(this);
    this.clearSettingsCache = this.clearSettingsCache.bind(this);
    this.notifySettingsReload = this.notifySettingsReload.bind(this);
    this.getStatus = this.getStatus.bind(this);
  }

  // 1. loadSettings
  loadSettings(source = 'init') {
    try {
      this.clearSettingsCache();
      const newSettings = require(SETTINGS_PATH);
      
      if (this.validateSettings(newSettings)) {
        const oldSettings = this.currentSettings;
        this.currentSettings = JSON.parse(JSON.stringify(newSettings)); // Deep copy
        this.lastReload = new Date();
        this.lastReloadSource = source;
        this.lastError = null;
        
        console.log(`[ConfigManager] Settings reloaded successfully (Source: ${source})`);
        
        // Use setImmediate to prevent circular require issues during boot
        setImmediate(() => {
          this.notifySettingsReload(oldSettings, this.currentSettings, source);
        });
        
        return true;
      } else {
        console.error(`[ConfigManager] Settings validation failed. Kept old settings.`);
        return false;
      }
    } catch (error) {
      console.error(`[ConfigManager] Failed to load settings: ${error.message}`);
      this.lastError = error.message;
      return false;
    }
  }

  // 2. getSettings
  getSettings() {
    if (!this.currentSettings) {
      // Synchronous load on first boot
      this.loadSettings('boot');
    }
    return this.currentSettings;
  }

  // 3. updateSettings
  async updateSettings(newSettings, changedBy = 'system') {
    if (!this.validateSettings(newSettings)) {
      throw new Error("Invalid settings provided");
    }

    if (newSettings.storage && newSettings.storage.backupBeforeSettingsChange) {
      await this.backupSettingsFile();
    }

    await this.writeSettingsFile(newSettings);
    
    // Once written, loadSettings will validate and update memory
    const success = this.loadSettings(`dashboard_update_by_${changedBy}`);
    
    if (success) {
      // Lazy load logService to avoid circular dependency
      const { logInfo } = require('../services/logService');
      await logInfo('info', `Settings updated by ${changedBy}`);
    } else {
      throw new Error("Settings saved but failed to reload into memory");
    }
  }

  // 4. reloadSettings
  reloadSettings(source = 'manual') {
    return this.loadSettings(source);
  }

  // 5. watchSettingsFile
  watchSettingsFile() {
    if (this.watcher) return;
    
    try {
      this.watcher = fs.watch(SETTINGS_PATH, (eventType, filename) => {
        if (eventType === 'change') {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            console.log(`[ConfigManager] Detected changes in settings.js, reloading...`);
            this.loadSettings('file_watcher');
          }, 1000); // 1s debounce
        }
      });
      console.log(`[ConfigManager] Watching settings.js for changes...`);
    } catch (e) {
      console.error(`[ConfigManager] Error watching settings.js:`, e);
    }
  }

  // 6. validateSettings
  validateSettings(settings) {
    try {
      if (!settings.telegram || !settings.telegram.botToken) throw new Error("telegram.botToken is required");
      if (!settings.telegram.botUsername) throw new Error("telegram.botUsername is required");
      
      if (!settings.youApi || !settings.youApi.apiKey) throw new Error("youApi.apiKey is required");
      if (!['research', 'search'].includes(settings.youApi.mode)) throw new Error("youApi.mode must be 'research' or 'search'");
      
      if (!settings.web || typeof settings.web.port !== 'number') throw new Error("web.port must be a number");
      if (!settings.web.sessionSecret) throw new Error("web.sessionSecret is required");
      
      if (!settings.admin || !settings.admin.superAdminId) throw new Error("admin.superAdminId is required");
      
      if (!settings.bot || typeof settings.bot.userDailyLimit !== 'number') throw new Error("bot.userDailyLimit must be a number");
      if (typeof settings.bot.broadcastDelayMs !== 'number') throw new Error("bot.broadcastDelayMs must be a number");
      
      if (!settings.security || typeof settings.security.maxRequestPerMinute !== 'number') throw new Error("security.maxRequestPerMinute must be a number");
      
      if (!settings.storage || !settings.storage.dataPath) throw new Error("storage.dataPath is required");

      return true;
    } catch (error) {
      this.lastError = error.message;
      
      // Lazy load logError to avoid circular deps
      try {
        const { logError } = require('../services/logService');
        logError('error', `Settings Validation Failed: ${error.message}`).catch(() => {});
      } catch (e) {
        // Ignored if logService is not available
      }
      return false;
    }
  }

  // 7. writeSettingsFile
  async writeSettingsFile(settings) {
    const content = `module.exports = ${JSON.stringify(settings, null, 2)};\n`;
    await fs.promises.writeFile(SETTINGS_PATH, content, 'utf8');
  }

  // 8. backupSettingsFile
  async backupSettingsFile() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
      }
      
      const date = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const timestamp = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
      
      const backupPath = path.join(BACKUP_DIR, `settings-${timestamp}.js`);
      await fs.promises.copyFile(SETTINGS_PATH, backupPath);
      console.log(`[ConfigManager] Backup created at ${backupPath}`);
    } catch (err) {
      console.error(`[ConfigManager] Failed to create settings backup:`, err);
    }
  }

  // 9. clearSettingsCache
  clearSettingsCache() {
    delete require.cache[require.resolve(SETTINGS_PATH)];
  }

  // 10. notifySettingsReload
  notifySettingsReload(oldSettings, newSettings, source) {
    this.emit('settingsReloaded', { oldSettings, newSettings, source });
  }

  // Extra helper to get status for dashboard
  getStatus() {
    return {
      lastReload: this.lastReload,
      lastReloadSource: this.lastReloadSource,
      lastError: this.lastError,
      isValid: this.lastError === null
    };
  }
}

const configManager = new ConfigManager();

module.exports = configManager;

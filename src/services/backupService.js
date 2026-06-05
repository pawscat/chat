const fs = require('fs').promises;
const path = require('path');
const { DATA_DIR, BACKUP_DIR } = require('../storage/jsonStore');
const { logInfo, logError } = require('./logService');

async function manualBackup() {
  try {
    const files = await fs.readdir(DATA_DIR);
    const timestamp = Date.now();
    const backupSubdir = path.join(BACKUP_DIR, `backup_${timestamp}`);
    
    await fs.mkdir(backupSubdir, { recursive: true });

    let backupCount = 0;
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sourcePath = path.join(DATA_DIR, file);
        const destPath = path.join(backupSubdir, file);
        await fs.copyFile(sourcePath, destPath);
        backupCount++;
      }
    }

    await logInfo('info', `Backup completed successfully. ${backupCount} files backed up to ${backupSubdir}`);
    return true;
  } catch (error) {
    console.error("Backup failed:", error);
    await logError('error', "Backup failed", error);
    return false;
  }
}

async function initBackup() {
  console.log("Starting initial backup...");
  await manualBackup();
}

module.exports = {
  manualBackup,
  initBackup
};

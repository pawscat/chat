const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const defaultData = {
  'users.json': [],
  'groups.json': [],
  'channels.json': [],
  'admins.json': [],
  'broadcasts.json': [],
  'usage.json': {
    total_requests: 0,
    today_requests: 0,
    monthly_requests: 0,
    date: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7),
    recent_requests: []
  },
  'api_usage.json': {
    total_requests: 0,
    success_requests: 0,
    failed_requests: 0,
    today_requests: 0,
    monthly_requests: 0,
    date: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7),
    last_error: null,
    average_response_time_ms: 0,
    per_user: {}
  },
  'settings.json': {
    maintenance_mode: false,
    allow_private_ai: true,
    allow_group_ai: true,
    user_daily_limit: 50,
    broadcast_delay_ms: 700,
    api_limit_monthly: 1000,
    bot_name: "You AI Bot",
    welcome_message: "Halo, saya bot AI. Kirim pertanyaan kamu sekarang."
  },
  'logs.json': [],
  'blacklist.json': []
};

async function ensureDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    for (const [fileName, defaultContent] of Object.entries(defaultData)) {
      const filePath = path.join(DATA_DIR, fileName);
      try {
        await fs.access(filePath);
      } catch (err) {
        // File doesn't exist, create it
        await atomicWrite(fileName, defaultContent);
        console.log(`Created default ${fileName}`);
      }
    }
  } catch (error) {
    console.error("Error ensuring data files:", error);
  }
}

async function atomicWrite(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, jsonString, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    console.error(`Failed to atomic write ${fileName}:`, error);
    try {
      await fs.unlink(tempPath);
    } catch (e) {
      // Ignore cleanup error
    }
    throw error;
  }
}

async function readJson(fileName, defaultValue = null) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error.message);
    // If file is corrupt, we might want to backup the corrupt file and return default
    if (error instanceof SyntaxError) {
      console.error(`File ${fileName} is corrupt! Restoring default data.`);
      await fs.copyFile(filePath, path.join(BACKUP_DIR, `${fileName}.corrupt.${Date.now()}`));
      await atomicWrite(fileName, defaultValue !== null ? defaultValue : defaultData[fileName]);
      return defaultValue !== null ? defaultValue : defaultData[fileName];
    }
    return defaultValue !== null ? defaultValue : defaultData[fileName];
  }
}

async function writeJson(fileName, data) {
  await atomicWrite(fileName, data);
}

async function updateJson(fileName, callback) {
  // Simple lock mechanism using promises could be implemented here for high concurrency
  // but for basic usage, read -> modify -> write is sufficient
  try {
    let data = await readJson(fileName);
    data = await callback(data);
    await atomicWrite(fileName, data);
    return data;
  } catch (error) {
    console.error(`Error updating ${fileName}:`, error);
    throw error;
  }
}

async function pushJson(fileName, item) {
  return await updateJson(fileName, (data) => {
    if (Array.isArray(data)) {
      data.push(item);
    } else {
      console.warn(`Cannot push to ${fileName}, it is not an array.`);
    }
    return data;
  });
}

async function findById(fileName, field, value) {
  const data = await readJson(fileName);
  if (Array.isArray(data)) {
    return data.find(item => item[field] === value);
  }
  return null;
}

module.exports = {
  ensureDataFiles,
  readJson,
  writeJson,
  updateJson,
  pushJson,
  findById,
  atomicWrite,
  DATA_DIR,
  BACKUP_DIR
};

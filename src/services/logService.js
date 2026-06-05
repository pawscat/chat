const jsonStore = require('../storage/jsonStore');

async function logInfo(type, message, details = {}) {
  try {
    const logEntry = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: type,
      message: message,
      details: details,
      created_at: new Date().toISOString()
    };
    await jsonStore.pushJson('logs.json', logEntry);
    console.log(`[${type.toUpperCase()}] ${message}`);
  } catch (err) {
    console.error("Failed to write to logs.json:", err);
  }
}

async function logError(type, message, error) {
  let errorDetails = {};
  if (error instanceof Error) {
    errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else {
    errorDetails = error;
  }
  
  await logInfo(type, message, errorDetails);
}

module.exports = {
  logInfo,
  logError
};

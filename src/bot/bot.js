const { Telegraf, session } = require('telegraf');
const commands = require('./commands');
const handlers = require('./handlers');
const { getSettings } = require('../config/configManager');

function createBot() {
  const settings = getSettings();
  const bot = new Telegraf(settings.telegram.botToken);

  // Simple session
  bot.use(session());

  // Register commands
  commands.registerCommands(bot);

  // Register handlers
  handlers.registerHandlers(bot);

  // Global Error Handler for bot
  bot.catch(async (err, ctx) => {
    console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
    const { logError } = require('../services/logService');
    await logError('error', `Bot Error on ${ctx.updateType}`, err);
  });

  return bot;
}

module.exports = {
  createBot
};

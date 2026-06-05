const { handleAdminAction } = require('./adminPanel');
const { handleBroadcastAction, handleBroadcastMessage, broadcastState } = require('./broadcast');
const { handleAiRequest } = require('./aiHandler');
const { updateGroupActive, updateChannelActive } = require('../services/statsService');
const jsonStore = require('../storage/jsonStore');

function registerHandlers(bot) {
  // Handle callbacks from inline keyboards
  bot.on('callback_query', async (ctx) => {
    const action = ctx.match && ctx.match[0] ? ctx.match[0] : ctx.callbackQuery.data;
    if (!action) return;

    if (action.startsWith('admin_') || action.startsWith('toggle_')) {
      await handleAdminAction(ctx);
      await ctx.answerCbQuery().catch(()=>{});
    } else if (action.startsWith('bc_')) {
      await handleBroadcastAction(ctx, action);
      await ctx.answerCbQuery().catch(()=>{});
    }
  });

  // Handle messages
  bot.on('message', async (ctx) => {
    const chatType = ctx.chat.type;

    // Save group info
    if (chatType === 'group' || chatType === 'supergroup') {
      await jsonStore.updateJson('groups.json', (data) => {
        const existing = data.find(g => g.chat_id === String(ctx.chat.id));
        if (!existing) {
          data.push({
            chat_id: String(ctx.chat.id),
            title: ctx.chat.title || null,
            username: ctx.chat.username || null,
            type: chatType,
            status: 'active',
            joined_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            last_broadcast_error: null
          });
        }
        return data;
      });
      await updateGroupActive(ctx.chat.id);
    }

    if (chatType === 'private') {
      const telegramId = ctx.from.id;
      // If user is in broadcast setup mode
      if (broadcastState.has(telegramId)) {
        await handleBroadcastMessage(ctx);
        return;
      }

      // Normal private message to AI
      if (ctx.message.text && !ctx.message.text.startsWith('/')) {
        await handleAiRequest(ctx, ctx.message.text);
      }
    } else if (chatType === 'group' || chatType === 'supergroup') {
      // In group, only answer if mentioned or starts with /ai
      const text = ctx.message.text || '';
      const botUsername = ctx.botInfo ? ctx.botInfo.username : process.env.BOT_USERNAME;
      const isMentioned = text.includes(`@${botUsername}`);
      const isAiCommand = text.startsWith('/ai ');

      if (isAiCommand) {
        const question = text.replace('/ai ', '');
        if (question.trim()) {
          await handleAiRequest(ctx, question);
        }
      } else if (isMentioned) {
        const question = text.replace(`@${botUsername}`, '').trim();
        if (question) {
          await handleAiRequest(ctx, question);
        }
      }
    }
  });

  // Handle bot added/removed from groups/channels
  bot.on('my_chat_member', async (ctx) => {
    const chat = ctx.chat;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const chatType = chat.type;

    if (chatType === 'group' || chatType === 'supergroup') {
      await jsonStore.updateJson('groups.json', (data) => {
        let group = data.find(g => g.chat_id === String(chat.id));
        if (!group) {
          group = {
            chat_id: String(chat.id),
            title: chat.title,
            username: chat.username,
            type: chatType,
            status: 'active',
            joined_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            last_broadcast_error: null
          };
          data.push(group);
        }
        if (newStatus === 'left' || newStatus === 'kicked') {
          group.status = 'inactive';
        } else if (newStatus === 'member' || newStatus === 'administrator') {
          group.status = 'active';
        }
        return data;
      });
    } else if (chatType === 'channel') {
      await jsonStore.updateJson('channels.json', (data) => {
        let channel = data.find(c => c.chat_id === String(chat.id));
        if (!channel) {
          channel = {
            chat_id: String(chat.id),
            title: chat.title,
            username: chat.username,
            type: chatType,
            status: 'active',
            joined_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            can_send_message: true,
            last_broadcast_error: null
          };
          data.push(channel);
        }
        if (newStatus === 'left' || newStatus === 'kicked') {
          channel.status = 'inactive';
        } else if (newStatus === 'administrator') {
          channel.status = 'active';
          channel.can_send_message = ctx.myChatMember.new_chat_member.can_post_messages !== false;
        }
        return data;
      });
    }
  });

  // Handle channel post (to save channel if not saved yet)
  bot.on('channel_post', async (ctx) => {
    await jsonStore.updateJson('channels.json', (data) => {
      let channel = data.find(c => c.chat_id === String(ctx.chat.id));
      if (!channel) {
        data.push({
          chat_id: String(ctx.chat.id),
          title: ctx.chat.title,
          username: ctx.chat.username,
          type: 'channel',
          status: 'active',
          joined_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          can_send_message: true,
          last_broadcast_error: null
        });
      } else {
        channel.last_active = new Date().toISOString();
        channel.status = 'active';
      }
      return data;
    });
    await updateChannelActive(ctx.chat.id);
  });
}

module.exports = {
  registerHandlers
};

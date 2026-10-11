import { ENVIRONMENT } from "../config/env.js";
import { logger } from "../config/logger.js";
import { localstorage } from "../utils/localstorage.js";

const message = 'Falta implementar';

export class Command {
  constructor({ bot, dependencies = {} }) {
    this.regex = null;
    this.bot = bot;
    this.dependencies = dependencies;
  }

  execute = async (msg) => {
    const chatId = msg.chat.id;
    this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  callback = async (msg) => {
    logger.debug(JSON.stringify(msg));

    if(msg?.chat?.id) {
      const chatId = msg.chat.id;
      const allowedChats = (ENVIRONMENT.TELEGRAM_CHAT_ID ?? '').split(',').map(chat => chat.trim()).filter(Boolean);
      const isChatPermitted = allowedChats.length === 0 || allowedChats.includes(chatId.toString());

      if(!isChatPermitted) {
        const message = '⚠️ Esse chat não tem permissão pra receber mensagens desse bot.';
        logger.warn(message);
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        return;
      }

      this.bot.tryDeleteMessage(chatId, msg.message_id);
      if(localstorage.lastMessageId) {
        this.bot.tryDeleteMessage(chatId, localstorage.lastMessageId);
      }
    }

    try {
      const lastMessage = await this.execute(msg);

      if(lastMessage) {
        this.bot.tryDeleteMessage(msg.chat.id, localstorage.lastMessageId);
        localstorage.lastMessageId = lastMessage.message_id;
      }

    } catch(e) {
      logger.error(e.message);
    }
  }

  checkAndCallback(query) {
    return false;
  }
}
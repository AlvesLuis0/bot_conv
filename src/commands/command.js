import { ENVIRONMENT } from "../config/env.js";
import { logger } from "../config/logger.js";

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
    const chatId = msg.chat.id;

    const isChatPermitted = [null, chatId.toString()].includes(ENVIRONMENT.TELEGRAM_CHAT_ID);
    if(!isChatPermitted) {
      const message = '⚠️ Esse chat não tem permissão pra receber mensagens desse bot.';
      logger.warn(message);
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    try {
      await this.execute(msg);
    } catch(e) {
      logger.error(e.message);
    }
  }

  checkAndCallback(query) {
    return false;
  }
}
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
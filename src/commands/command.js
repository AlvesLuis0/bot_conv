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
}
import { Command } from "./command.js";
import { formatTimeFrom } from "../utils/time-format.js"

export class StatusCommand extends Command {
  regex = /^\/status$/;

  execute = async (msg) => {
    const chatId = msg.chat.id;
    const usageStorage = this.dependencies.usageStorage;

    if (!usageStorage.data.size) {
      await this.bot.sendMessage(chatId, '✅ Todas as conversões estão disponíveis.');
      return;
    }

    let message = '*Status atual das conversões:*\n\n';

    for (const [i, usage] of usageStorage.data.entries()) {
      const timeFormatted = formatTimeFrom(usage.timestamp);
      message += `Conversão ${i}: 🔒 Em uso por @${usage.username} (há ${timeFormatted})\n`;
    }

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
}
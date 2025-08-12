import { ConversionManager } from "../services/conversion-manager.js";
import { generateConversionInlineKeyboard, mapConversions } from "../utils/conversion.js";
import { Command } from "./command.js";

export class SetUsageCommand extends Command {
  execute = async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const action = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const username = callbackQuery.from.username || callbackQuery.from.first_name;
    const [,conv] = action.split('_');
    const usageStorage = this.dependencies.usageStorage;

    usageStorage.setUsage(conv, { username, userId });

    const conversions = mapConversions(usageStorage, ConversionManager.getNames());
    const inlineKeyboard = generateConversionInlineKeyboard(conversions);
    
    this.bot.answerCallbackQuery(callbackQuery.id, {
      text: `✅ Você está usando a Conversão ${conv}.`,
      show_alert: false
    });

    const message = '*Bases rodando em cada conversão:*\n\n_Selecione uma conversão para informar se está em uso por você._';
    this.bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });

    usageStorage.save();
  }

  checkAndExecute(query) {
    if(query.data.startsWith('usar')) {
      this.execute(query);
      return true;
    }
    return false;
  }
}
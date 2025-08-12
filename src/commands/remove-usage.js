import { ConversionManager } from "../services/conversion-manager.js";
import { generateConversionInlineKeyboard, mapConversions } from "../utils/conversion.js";
import { Command } from "./command.js";

export class RemoveUsageCommand extends Command {
  execute = async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = callbackQuery.from.id;
    const action = callbackQuery.data;
    const [,conv] = action.split('_');
    const usageStorage = this.dependencies.usageStorage;
    const usage = usageStorage.getUsage(conv);

    const permittedIds = [
      usage.userId
    ];

    if(!permittedIds.includes(userId)) {
      this.bot.answerCallbackQuery(callbackQuery.id, {
        text: `❌ Apenas o usuário @${usage.username} ou administradores podem liberar esta conversão.`,
        show_alert: true
      });
      return;
    }

    usageStorage.removeUsage(conv);

    const conversions = mapConversions(usageStorage, ConversionManager.getNames());
    const inlineKeyboard = generateConversionInlineKeyboard(conversions);
    
    this.bot.answerCallbackQuery(callbackQuery.id, {
      text: `✅ Conversão ${conv} liberada com sucesso.`,
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
    if(query.data.startsWith('liberar')) {
      this.execute(query);
      return true;
    }
    return false;
  }
}
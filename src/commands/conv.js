import { Command } from "./command.js";
import { ConversionManager } from "../services/conversion-manager.js";
import { generateConversionInlineKeyboard, getAllConversions, mapConversions } from "../utils/conversion.js";

export class ConvCommand extends Command {
  regex = /^\/conv$/;

  execute = async (msg) => {
    const chatId = msg.chat.id;
    const usageStorage = this.dependencies.usageStorage;

    const message = '*Bases rodando em cada conversão:*\n\n_Selecione uma conversão para informar se está em uso por você._';
    const responses = await getAllConversions();
    const conversions = mapConversions(usageStorage, responses);
    const inlineKeyboard = generateConversionInlineKeyboard(conversions);

    for(const conv of conversions) {
      ConversionManager.setName(conv.number, conv.name);
    }

    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard
    });
  }
}
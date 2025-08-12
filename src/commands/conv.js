import { Command } from "./command.js";
import { ConversionService } from "../services/conversion.js";
import { ConversionManager } from "../services/conversion-manager.js";

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



// utils
async function getAllConversions() {
  const requests = [];
  for(let i = 1; i <= 9; i++) {
    requests.push(new ConversionService(i).getName());
  }
  return await Promise.all(requests);
}

function mapConversions(usageStorage, responses) {
  const conversions = [];
  for(let i = 1; i <= 9; i++) {
    const name = responses[i - 1];
    const usage = usageStorage.data.get(i);
    conversions.push({
      number: i,
      name,
      inUse: !!usage,
      username: usage?.username
    });
  }
  return conversions;
}

function generateConversionInlineKeyboard(conversions) {
  const keyboard = [];

  for (const conv of conversions) {
    const row = [];

    const emoji = conv.inUse ? '🔴' : '🟢';
    let text = `${emoji} Conversão ${conv.number}: ${conv.name}`;
    if (conv.inUse && conv.username) {
      text += ` @${conv.username}`;
    }
    
    const actionType = conv.inUse ? 'liberar' : 'usar';
    row.push({
      text: text,
      callback_data: `${actionType}_${conv.number}`
    });

    keyboard.push(row);
  }
  
  return {
    inline_keyboard: keyboard
  };
}
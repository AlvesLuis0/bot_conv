import { ConversionService } from "../services/conversion.js";

export async function getAllConversions() {
  const requests = [];
  for(let i = 1; i <= 9; i++) {
    requests.push(new ConversionService(i).getName());
  }
  return await Promise.all(requests);
}

export function mapConversions(usageStorage, responses) {
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

export function generateConversionInlineKeyboard(conversions) {
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
import { ENVIRONMENT } from './config/env.js';
import { UsageStorage } from './services/usage-storage.js';
import { HelpCommand } from './commands/help.js';
import { StatusCommand } from './commands/status.js';
import { ConvCommand } from './commands/conv.js';
import { SetUsageCommand } from './commands/set-usage.js';
import { RemoveUsageCommand } from './commands/remove-usage.js';
import TelegramBot from 'node-telegram-bot-api';
import { getAllConversions } from './utils/conversion.js';
import { ConversionManager } from './services/conversion-manager.js';
import { logger } from './config/logger.js';

const bot = new TelegramBot(ENVIRONMENT.TELEGRAM_TOKEN, { polling: true });
const usageStorage = new UsageStorage('conversao-usage.json');
const helpCommand = new HelpCommand({ bot });
const statusCommand = new StatusCommand({ bot, dependencies: { usageStorage } });
const convCommand = new ConvCommand({ bot, dependencies: { usageStorage } });
const setUsageCommand = new SetUsageCommand({ bot, dependencies: { usageStorage } });
const removeUsageCommand = new RemoveUsageCommand({ bot, dependencies: { usageStorage } });

usageStorage.load();

(async function() {
  const responses = await getAllConversions();
  for(let i = 1; i <= 9; i++) {
    ConversionManager.setName(i, responses[i - 1]);
  }
})()

bot.onText(helpCommand.regex, helpCommand.callback);
bot.onText(statusCommand.regex, statusCommand.callback);
bot.onText(convCommand.regex, convCommand.callback);
bot.on('callback_query', async (callbackQuery) => {
  if (setUsageCommand.checkAndCallback(callbackQuery)) return;
  if (removeUsageCommand.checkAndCallback(callbackQuery)) return;
});

logger.info('Bot iniciado com sucesso!');
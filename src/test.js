import { ENVIRONMENT } from './config/env.js';
import { UsageStorage } from './services/usage-storage.js';
import { HelpCommand } from './commands/help.js';
import { StatusCommand } from './commands/status.js';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(ENVIRONMENT.TELEGRAM_TOKEN, { polling: true });
const usageStorage = new UsageStorage('conversao-usage.json');
const helpCommand = new HelpCommand({ bot });
const statusCommand = new StatusCommand({ bot, dependencies: { usageStorage } });

usageStorage.load();

bot.onText(helpCommand.regex, helpCommand.execute);
bot.onText(statusCommand.regex, statusCommand.execute);

console.log('Bot iniciado com sucesso!');
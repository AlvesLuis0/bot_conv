import { HelpCommand } from './commands/help.js';
import { ENVIRONMENT } from './config/env.js';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(ENVIRONMENT.TELEGRAM_TOKEN, { polling: true });

bot.onText(HelpCommand.regex, (msg) => HelpCommand.execute(bot, msg));

console.log('Bot iniciado com sucesso!');
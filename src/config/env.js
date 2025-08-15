import dotenv from 'dotenv';
import packageInfo from '../../package.json' assert { type: 'json' };
dotenv.config();

export const ENVIRONMENT = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  CONV_USERNAME: process.env.CONV_USERNAME,
  CONV_PASSWORD: process.env.CONV_PASSWORD,
  VERSION: packageInfo.version,
  TZ: process.env.TZ
}
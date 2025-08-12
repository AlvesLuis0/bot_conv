import dotenv from 'dotenv';
dotenv.config();

export const ENVIRONMENT = {
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  CONV_USERNAME: process.env.CONV_USERNAME,
  CONV_PASSWORD: process.env.CONV_PASSWORD
}
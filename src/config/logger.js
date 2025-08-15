import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";


const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  timestamp = new Date(timestamp);
  timestamp = timestamp.toLocaleString('pt-BR');
  timestamp = timestamp.replace(',', '');
  return `${timestamp} ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    logFormat
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    // log pros devs
    new DailyRotateFile({
      filename: 'logs/%DATE%.develop.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'silly'
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});
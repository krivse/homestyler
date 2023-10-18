import 'dotenv/config';
import {validate} from './validate.js';
import {p_homestyler} from './homestyler.js';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import logger from './logger.js';


process.env.NTBA_FIX_350 = "true"
let bot 
if (process.env.BOT_TOKEN) {
  let TOKEN = process.env.BOT_TOKEN;
  bot = new TelegramBot(TOKEN, {polling: true})
  console.log('Bot started')
} else {
  throw new Error('BOT_TOKEN is not defined');
}



bot.on('message', async msg => {
  // Handle all other messages with content_type 'text' (content_types defaults to ['text'])
  if (msg.text == '/start'){
    await bot.sendMessage(msg.chat.id, 'Через пробел передайте номер "id" меняемого объекта и название или артикул нового объекта.')
  }
  else {
    let validate_data = validate(msg.text)
    if (validate_data[0] == 400) {
      await bot.sendMessage(msg.chat.id, validate_data[1])
    } else {
      logger.info(`log:: num: ${validate_data[1]}, name: ${validate_data[2]}`)
      let answer = await p_homestyler(validate_data[1], validate_data[2])
      if (answer[0] == 200) {
        await bot.sendPhoto(msg.chat.id, answer[2], {caption: answer[1]})  
        fs.unlink(answer[2], () => {})
      } else {
        await bot.sendMessage(msg.chat.id, answer[1])
      }
    }
  }
});

// Enable graceful stop
// process.once('SIGINT', () => bot.stop('SIGINT'));
// process.once('SIGTERM', () => bot.stop('SIGTERM'));

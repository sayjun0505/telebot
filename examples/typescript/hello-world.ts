import { TeleBot } from "../../src";

const TOKEN = process.env.TELEBOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";

const bot = new TeleBot(TOKEN);

bot.on("text", (msg) => bot.sendMessage(msg.chat.id, "Hello, World!"));

bot.start();
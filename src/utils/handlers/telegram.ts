import TelegramBot from "node-telegram-bot-api";

export class TelegramManager {
  private static instance: TelegramManager;
  private bot: TelegramBot;

  private constructor(key: string) {
    this.bot = new TelegramBot(key, { polling: true });
  }

  // Singleton getter
  public static init(key: string) {
    if (!TelegramManager.instance) {
      TelegramManager.instance = new TelegramManager(key);
    }
    return TelegramManager.instance;
  }

  public static getInstance(): TelegramManager {
    if (!TelegramManager.instance) {
      throw new Error("TelegramManager not initialized. Call init() first.");
    }
    return TelegramManager.instance;
  }

  public getBot(): TelegramBot {
    return this.bot;
  }

  public async sendMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error(`Error sending message to ${chatId}:`, error);
    }
  }
}

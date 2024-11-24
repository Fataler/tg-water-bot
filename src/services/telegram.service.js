const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config');

class TelegramService {
    constructor() {
        this.bot = new TelegramBot(config.telegram.token, config.telegram.options);
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.bot.on('polling_error', (error) => {
            console.error('Telegram polling error:', error);
        });

        this.bot.on('error', (error) => {
            console.error('Telegram error:', error);
        });
    }

    async sendMessage(chatId, text, options = {}) {
        try {
            const defaultOptions = { disable_notification: true };
            return await this.bot.sendMessage(chatId, text, { ...defaultOptions, ...options });
        } catch (error) {
            console.error(`Error sending message to ${chatId}:`, error);
            throw error;
        }
    }

    async deleteMessage(chatId, messageId) {
        try {
            return await this.bot.deleteMessage(chatId, messageId);
        } catch (error) {
            console.error(`Error deleting message ${messageId} in chat ${chatId}:`, error);
            throw error;
        }
    }

    onText(regex, callback) {
        this.bot.onText(regex, callback);
    }

    onCallback(callback) {
        this.bot.on('callback_query', callback);
    }

    getBot() {
        return this.bot;
    }
}

module.exports = new TelegramService();

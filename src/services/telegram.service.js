const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config');
const logger = require('../config/logger.config');

class TelegramService {
    constructor() {
        this.bot = new TelegramBot(config.telegram.token, config.telegram.options);
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.bot.on('error', (error) => {
            logger.error('Telegram error:', error);
        });
    }

    async sendMessage(chatId, text, options = {}) {
        if (!text) {
            logger.error(`Attempt to send empty message to chat ${chatId}`);
            return;
        }

        try {
            return await this.bot.sendMessage(chatId, text, {
                disable_notification: true,
                ...options,
            });
        } catch (error) {
            logger.error(`Error sending message to ${chatId}:`, error);
            throw error;
        }
    }

    async deleteMessage(chatId, messageId) {
        try {
            await this.bot.deleteMessage(chatId, messageId);
        } catch (error) {
            logger.error(`Error deleting message ${messageId} in chat ${chatId}:`, error);
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

    async editMessageText(chatId, messageId, text, options = {}) {
        try {
            return await this.bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                ...options,
            });
        } catch (error) {
            logger.error(`Error editing message ${messageId} in chat ${chatId}:`, error);
            throw error;
        }
    }
}

module.exports = new TelegramService();

const mockBot = {
    sendMessage: jest.fn(),
    editMessageText: jest.fn(),
    deleteMessage: jest.fn(),
    answerCallbackQuery: jest.fn(),
    getMe: jest.fn().mockResolvedValue({ id: 123 }),
    onText: jest.fn(),
    on: jest.fn(),
    close: jest.fn()
};

class TelegramServiceMock {
    constructor() {
        this.bot = mockBot;
    }

    async sendMessage(chatId, text, options = {}) {
        return this.bot.sendMessage(chatId, text, options);
    }

    async editMessage(chatId, messageId, text, options = {}) {
        return this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            ...options,
        });
    }

    async deleteMessage(chatId, messageId) {
        return this.bot.deleteMessage(chatId, messageId);
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

module.exports = { TelegramServiceMock };

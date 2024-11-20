const EventEmitter = require('events');

class MockTelegramBot extends EventEmitter {
    constructor() {
        super();
    }

    sendMessage() {
        return Promise.resolve({ message_id: 1 });
    }

    on() {
        return this;
    }

    onText() {
        return this;
    }

    editMessageText() {
        return Promise.resolve();
    }

    deleteMessage() {
        return Promise.resolve();
    }

    answerCallbackQuery() {
        return Promise.resolve();
    }
}

const bot = new MockTelegramBot();

const sendMessageMock = jest.fn().mockImplementation((chatId, text, options = {}) => {
    if (options.keyboard) {
        options.reply_markup = { keyboard: options.keyboard };
        delete options.keyboard;
    }
    return Promise.resolve({ message_id: 1 });
});

module.exports = {
    getBot: () => bot,
    sendMessage: sendMessageMock,
    editMessage: jest.fn().mockResolvedValue(true),
    deleteMessage: jest.fn().mockResolvedValue(true),
    onText: jest.fn(),
    on: jest.fn(),
};

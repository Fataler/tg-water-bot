const MessageHandler = require('../../src/handlers/message.handler');
const telegramService = require('../../tests/mocks/telegram.service.mock');
const dbService = require('../../src/services/database.service');
const ValidationUtil = require('../../src/utils/validation.util');
const callbackHandler = require('../../src/handlers/callback.handler');
const KeyboardUtil = require('../../src/utils/keyboard.util');

// Мокаем все зависимости
jest.mock('../../src/services/telegram.service', () => require('../../tests/mocks/telegram.service.mock'));
jest.mock('../../src/services/database.service');
jest.mock('../../src/utils/keyboard.util');
jest.mock('../../src/handlers/callback.handler');
jest.mock('../../src/utils/validation.util');

describe('MessageHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        callbackHandler.userTemp = new Map();
        
        // Настраиваем мок для KeyboardUtil.getMainKeyboard
        KeyboardUtil.getMainKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
    });

    describe('handleMessage', () => {
        it('should handle custom input when userTemp exists', async () => {
            const chatId = 123456;
            const text = '2.5';
            const msg = { chat: { id: chatId }, text };
            const userTemp = { waitingFor: 'custom_goal' };
            
            callbackHandler.userTemp.set(chatId, userTemp);
            
            await MessageHandler.handleMessage(msg);
            
            expect(callbackHandler.userTemp.has(chatId)).toBeFalsy();
        });

        it('should not process custom input when userTemp does not exist', async () => {
            const msg = { chat: { id: 123456 }, text: '2.5' };
            
            await MessageHandler.handleMessage(msg);
            
            expect(telegramService.sendMessage).not.toHaveBeenCalled();
            expect(dbService.addUser).not.toHaveBeenCalled();
        });
    });

    describe('handleCustomInput', () => {
        it('should handle invalid number input', async () => {
            const chatId = 123456;
            const text = 'invalid';
            const userTemp = { waitingFor: 'custom_goal' };

            ValidationUtil.sanitizeNumber = jest.fn().mockReturnValue(null);

            await MessageHandler.handleCustomInput(chatId, text, userTemp);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                chatId,
                '⚠️ Укажи корректное число.',
                { keyboard: [] }
            );
        });

        it('should handle custom goal setting', async () => {
            const chatId = 123456;
            const text = '2.5';
            const userTemp = { waitingFor: 'custom_goal' };

            ValidationUtil.sanitizeNumber = jest.fn().mockReturnValue(2.5);
            ValidationUtil.isValidGoal = jest.fn().mockReturnValue(true);

            await MessageHandler.handleCustomInput(chatId, text, userTemp);

            expect(dbService.addUser).toHaveBeenCalledWith(chatId, 2.5);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                chatId,
                '🎯 Цель установлена! Можешь начинать отслеживать потребление воды.',
                { keyboard: [] }
            );
        });

        it('should handle custom water intake', async () => {
            const chatId = 123456;
            const text = '0.5';
            const userTemp = { waitingFor: 'custom_water' };

            ValidationUtil.sanitizeNumber = jest.fn().mockReturnValue(0.5);
            ValidationUtil.isValidAmount = jest.fn().mockReturnValue(true);

            await MessageHandler.handleCustomInput(chatId, text, userTemp);

            expect(callbackHandler.handleDrinkIntake).toHaveBeenCalledWith(
                chatId,
                0.5,
                'water'
            );
        });
    });
});

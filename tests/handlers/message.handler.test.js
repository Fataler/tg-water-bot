const TelegramServiceMock = require('../mocks/telegram.service.mock');
const DatabaseServiceMock = require('../mocks/database.service.mock');
const KeyboardUtil = require('../../src/utils/keyboard.util');
const ValidationUtil = require('../../src/utils/validation.util');
const callbackHandler = require('../../src/handlers/callback.handler');
const MESSAGE = require('../../src/config/message.config');
const config = require('../../src/config/config');

// Мокаем модули
jest.mock('../../src/services/telegram.service', () => ({
    sendMessage: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    getBot: jest.fn().mockReturnValue({
        on: jest.fn()
    })
}));

jest.mock('../../src/services/database.service', () => ({
    getUser: jest.fn(),
    addUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    addWaterIntake: jest.fn(),
    getDailyWaterIntake: jest.fn()
}));

jest.mock('../../src/utils/validation.util');
jest.mock('../../src/handlers/callback.handler', () => ({
    userTemp: new Map(),
    handleDrinkIntake: jest.fn()
}));

describe('MessageHandler', () => {
    let messageHandler;
    let telegramService;
    let dbService;
    
    const mockChatId = 123456789;
    const mockMsg = {
        chat: { id: mockChatId },
        text: 'test message'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Получаем свежие инстансы сервисов
        telegramService = require('../../src/services/telegram.service');
        dbService = require('../../src/services/database.service');
        
        // Настраиваем базовые моки
        telegramService.getBot = jest.fn().mockReturnValue({
            on: jest.fn()
        });
        
        // Очищаем временные данные пользователя
        callbackHandler.userTemp.clear();
        
        // Получаем свежий инстанс хендлера
        messageHandler = require('../../src/handlers/message.handler');
    });

    describe('handleMessage', () => {
        it('should ignore /start command', async () => {
            const startMsg = { ...mockMsg, text: '/start' };
            
            await messageHandler.handleMessage(startMsg);
            
            expect(dbService.getUser).not.toHaveBeenCalled();
            expect(telegramService.sendMessage).not.toHaveBeenCalled();
        });

        it('should handle non-existing user', async () => {
            dbService.getUser.mockResolvedValue(null);
            
            await messageHandler.handleMessage(mockMsg);
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.userNotFound
            );
        });

        it('should handle message for existing user without temp data', async () => {
            const mockUser = { id: 1, chatId: mockChatId };
            dbService.getUser.mockResolvedValue(mockUser);
            
            await messageHandler.handleMessage(mockMsg);
            
            expect(telegramService.sendMessage).not.toHaveBeenCalled();
        });

        it('should handle error gracefully', async () => {
            dbService.getUser.mockRejectedValue(new Error('DB Error'));
            
            await messageHandler.handleMessage(mockMsg);
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.general
            );
        });
    });

    describe('handleCustomInput', () => {
        beforeEach(() => {
            ValidationUtil.sanitizeNumber.mockImplementation(text => parseFloat(text));
        });

        it('should handle invalid number input', async () => {
            ValidationUtil.sanitizeNumber.mockReturnValue(null);
            
            await messageHandler.handleCustomInput(mockChatId, 'invalid', { waitingFor: 'custom_goal' });
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.validation.invalidNumber,
                KeyboardUtil.getMainKeyboard()
            );
            expect(dbService.addUser).not.toHaveBeenCalled();
        });

        describe('custom goal handling', () => {
            const mockAmount = 2.5;
            const userTemp = { waitingFor: 'custom_goal' };

            it('should handle valid goal amount', async () => {
                ValidationUtil.isValidGoal.mockReturnValue(true);
                
                await messageHandler.handleCustomInput(mockChatId, mockAmount.toString(), userTemp);
                
                expect(dbService.addUser).toHaveBeenCalledWith(mockChatId, mockAmount);
                expect(telegramService.sendMessage).toHaveBeenCalledWith(
                    mockChatId,
                    MESSAGE.success.goalSet,
                    KeyboardUtil.getMainKeyboard()
                );
            });

            it('should handle invalid goal amount', async () => {
                ValidationUtil.isValidGoal.mockReturnValue(false);
                
                await messageHandler.handleCustomInput(mockChatId, mockAmount.toString(), userTemp);
                
                expect(dbService.addUser).not.toHaveBeenCalled();
                expect(telegramService.sendMessage).toHaveBeenCalledWith(
                    mockChatId,
                    MESSAGE.errors.validation.goal(
                        config.validation.water.minAmount,
                        config.validation.water.maxAmount * 2
                    )
                );
            });
        });

        describe('custom drink handling', () => {
            const mockAmount = 0.5;

            it('should handle valid water amount', async () => {
                const userTemp = { waitingFor: 'custom_water' };
                ValidationUtil.isValidAmount.mockReturnValue(true);
                
                await messageHandler.handleCustomInput(mockChatId, mockAmount.toString(), userTemp);
                
                expect(callbackHandler.handleDrinkIntake).toHaveBeenCalledWith(
                    mockChatId,
                    mockAmount.toString(),
                    'water'
                );
            });

            it('should handle valid other drink amount', async () => {
                const userTemp = { waitingFor: 'custom_other' };
                ValidationUtil.isValidAmount.mockReturnValue(true);
                
                await messageHandler.handleCustomInput(mockChatId, mockAmount.toString(), userTemp);
                
                expect(callbackHandler.handleDrinkIntake).toHaveBeenCalledWith(
                    mockChatId,
                    mockAmount.toString(),
                    'other'
                );
            });

            it('should handle invalid drink amount', async () => {
                const userTemp = { waitingFor: 'custom_water' };
                ValidationUtil.isValidAmount.mockReturnValue(false);
                
                await messageHandler.handleCustomInput(mockChatId, mockAmount.toString(), userTemp);
                
                expect(callbackHandler.handleDrinkIntake).not.toHaveBeenCalled();
                expect(telegramService.sendMessage).toHaveBeenCalledWith(
                    mockChatId,
                    MESSAGE.errors.validation.amount(
                        config.validation.water.minAmount,
                        config.validation.water.maxAmount
                    )
                );
            });
        });
    });

    describe('setupHandler', () => {
        it('should set up message handler', () => {
            messageHandler.setupHandler();
            
            expect(telegramService.getBot().on).toHaveBeenCalledWith(
                'message',
                expect.any(Function)
            );
        });
    });
});

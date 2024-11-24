const TelegramServiceMock = require('../mocks/telegram.service.mock');
const DatabaseServiceMock = require('../mocks/database.service.mock');
const NotificationServiceMock = require('../mocks/notification.service.mock');
const KeyboardUtil = require('../../src/utils/keyboard.util');
const MESSAGE = require('../../src/config/message.config');
const config = require('../../src/config/config');

// Мокаем модули
jest.mock('../../src/services/telegram.service', () => ({
    sendMessage: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    getBot: jest.fn().mockReturnValue({
        answerCallbackQuery: jest.fn().mockResolvedValue(true)
    }),
    onText: jest.fn()
}));

jest.mock('../../src/services/database.service', () => ({
    getUser: jest.fn(),
    addUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    addWaterIntake: jest.fn(),
    getDailyWaterIntake: jest.fn(),
    getWeeklyWaterIntake: jest.fn(),
    getMonthlyWaterIntake: jest.fn(),
    getAllTimeWaterIntake: jest.fn()
}));

jest.mock('../../src/services/notification.service', () => ({
    scheduleReminders: jest.fn(),
    cancelReminders: jest.fn(),
    sendWaterReminder: jest.fn()
}));

describe('CommandHandler', () => {
    let commandHandler;
    let telegramService;
    let dbService;
    let notificationService;

    beforeEach(() => {
        // Очищаем все моки перед каждым тестом
        jest.clearAllMocks();
        
        // Получаем свежие инстансы сервисов
        telegramService = require('../../src/services/telegram.service');
        dbService = require('../../src/services/database.service');
        notificationService = require('../../src/services/notification.service');
        
        // Получаем свежий инстанс хендлера
        commandHandler = require('../../src/handlers/command.handler');
    });

    describe('handleStart', () => {
        const mockMsg = {
            chat: {
                id: 123456789
            }
        };

        it('should send welcome message for new user', async () => {
            // Настраиваем мок для нового пользователя
            dbService.getUser.mockResolvedValue(null);

            await commandHandler.handleStart(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.commands.start.welcome,
                KeyboardUtil.getGoalKeyboard()
            );
        });

        it('should send welcome back message for existing user', async () => {
            // Настраиваем мок для существующего пользователя
            dbService.getUser.mockResolvedValue({ chatId: mockMsg.chat.id });

            await commandHandler.handleStart(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.commands.start.welcome_back,
                KeyboardUtil.getMainKeyboard()
            );
        });

        it('should handle blocked bot scenario', async () => {
            dbService.getUser.mockResolvedValue({ chatId: mockMsg.chat.id });
            telegramService.sendMessage.mockRejectedValue({
                response: { body: { error_code: 403 } }
            });

            await commandHandler.handleStart(mockMsg);

            expect(dbService.deleteUser).toHaveBeenCalledWith(mockMsg.chat.id);
        });
    });

    describe('handleReset', () => {
        const mockMsg = {
            chat: { id: 123456789 }
        };

        it('should send reset confirmation message', async () => {
            await commandHandler.handleReset(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.prompts.reset.confirm,
                KeyboardUtil.getResetConfirmKeyboard
            );
        });
    });

    describe('handleAddWater', () => {
        const mockMsg = {
            chat: { id: 123456789 }
        };

        it('should send add water message with drink type keyboard', async () => {
            await commandHandler.handleAddWater(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.commands.addWater,
                KeyboardUtil.getDrinkTypeKeyboard()
            );
        });
    });

    describe('handleStats', () => {
        const mockMsg = {
            chat: { id: 123456789 }
        };

        it('should send stats message with stats keyboard', async () => {
            await commandHandler.handleStats(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.commands.stats,
                KeyboardUtil.getStatsKeyboard()
            );
        });
    });

    describe('handleSettings', () => {
        const mockMsg = {
            chat: { id: 123456789 }
        };
        const mockUser = { chatId: 123456789 };
        const mockMessage = { message_id: 1 };

        it('should send and update settings message for existing user', async () => {
            dbService.getUser.mockResolvedValue(mockUser);
            telegramService.sendMessage.mockResolvedValue(mockMessage);

            await commandHandler.handleSettings(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.commands.settings,
                KeyboardUtil.getSettingsKeyboard(mockUser, null)
            );

            expect(telegramService.editMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                mockMessage.message_id,
                MESSAGE.commands.settings,
                KeyboardUtil.getSettingsKeyboard(mockUser, mockMessage.message_id)
            );
        });

        it('should handle error when user not found', async () => {
            dbService.getUser.mockResolvedValue(null);

            await commandHandler.handleSettings(mockMsg);

            expect(telegramService.editMessage).not.toHaveBeenCalled();
        });
    });

    describe('handleHelp', () => {
        const mockMsg = {
            chat: { id: 123456789 }
        };

        it('should send help message', async () => {
            await commandHandler.handleHelp(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.commands.help,
                { parse_mode: 'Markdown' }
            );
        });
    });

    describe('handleDebug', () => {
        const mockMsg = {
            chat: { id: 123456789 },
            from: { id: config.adminIds[0] }
        };
        const mockUser = { chatId: 123456789 };

        it('should send test notification for admin user', async () => {
            dbService.getUser.mockResolvedValue(mockUser);
            notificationService.sendWaterReminder.mockResolvedValue(true);

            await commandHandler.handleDebug(mockMsg);

            expect(notificationService.sendWaterReminder).toHaveBeenCalledWith(mockUser);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.commands.debug.testNotificationSent
            );
        });

        it('should handle non-admin user', async () => {
            const nonAdminMsg = {
                ...mockMsg,
                from: { id: 999999 }
            };

            await commandHandler.handleDebug(nonAdminMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                nonAdminMsg.chat.id,
                MESSAGE.errors.noAccess
            );
            expect(notificationService.sendWaterReminder).not.toHaveBeenCalled();
        });

        it('should handle user not found', async () => {
            dbService.getUser.mockResolvedValue(null);

            await commandHandler.handleDebug(mockMsg);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockMsg.chat.id,
                MESSAGE.errors.userNotFound
            );
            expect(notificationService.sendWaterReminder).not.toHaveBeenCalled();
        });
    });

    describe('setupHandlers', () => {
        it('should set up all command handlers', () => {
            commandHandler.setupHandlers();

            expect(telegramService.onText).toHaveBeenCalledTimes(7);
            expect(telegramService.onText).toHaveBeenCalledWith(/\/start/, commandHandler.handleStart);
            expect(telegramService.onText).toHaveBeenCalledWith(/\/reset/, commandHandler.handleReset);
            expect(telegramService.onText).toHaveBeenCalledWith(/💧 Добавить воду/, commandHandler.handleAddWater);
            expect(telegramService.onText).toHaveBeenCalledWith(/📊 Статистика/, commandHandler.handleStats);
            expect(telegramService.onText).toHaveBeenCalledWith(/⚙️ Настройки/, commandHandler.handleSettings);
            expect(telegramService.onText).toHaveBeenCalledWith(/\/help/, commandHandler.handleHelp);
            expect(telegramService.onText).toHaveBeenCalledWith(/\/debug/, commandHandler.handleDebug);
        });
    });
});

const CommandHandler = require('../../src/handlers/command.handler');
const telegramService = require('../../tests/mocks/telegram.service.mock');
const dbService = require('../../src/services/database.service');
const notificationService = require('../../src/services/notification.service');
const KeyboardUtil = require('../../src/utils/keyboard.util');
const config = require('../../src/config/config');

// Мокаем все зависимости
jest.mock('../../src/services/telegram.service', () => require('../../tests/mocks/telegram.service.mock'));
jest.mock('../../src/services/database.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/utils/keyboard.util');
jest.mock('../../src/config/config');

describe('CommandHandler', () => {
    const mockChatId = 123456;
    const mockMessage = { chat: { id: mockChatId } };

    beforeEach(() => {
        jest.clearAllMocks();
        KeyboardUtil.getMainKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        KeyboardUtil.getGoalKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        KeyboardUtil.getDrinkTypeKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        KeyboardUtil.getStatsKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        KeyboardUtil.getSettingsKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
    });

    describe('handleStart', () => {
        it('should send welcome message for new user', async () => {
            dbService.getUser = jest.fn().mockResolvedValue(null);

            await CommandHandler.handleStart(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('👋 Привет!'),
                expect.any(Object)
            );
            expect(KeyboardUtil.getGoalKeyboard).toHaveBeenCalled();
        });

        it('should send welcome back message for existing user', async () => {
            dbService.getUser = jest.fn().mockResolvedValue({ chatId: mockChatId });

            await CommandHandler.handleStart(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('👋 С возвращением!'),
                expect.any(Object)
            );
            expect(KeyboardUtil.getMainKeyboard).toHaveBeenCalled();
        });

        it('should handle blocked bot error', async () => {
            dbService.getUser = jest.fn().mockResolvedValue({ chatId: mockChatId });
            const error = new Error('Bot was blocked');
            error.response = { body: { error_code: 403 } };
            telegramService.sendMessage = jest.fn().mockRejectedValue(error);

            await CommandHandler.handleStart(mockMessage);

            expect(dbService.deleteUser).toHaveBeenCalledWith(mockChatId);
        });
    });

    describe('handleReset', () => {
        it('should send confirmation message', async () => {
            await CommandHandler.handleReset(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('⚠️ Ты уверен(а)'),
                expect.objectContaining({
                    reply_markup: expect.objectContaining({
                        inline_keyboard: expect.any(Array)
                    })
                })
            );
        });
    });

    describe('handleAddWater', () => {
        it('should show drink type keyboard', async () => {
            await CommandHandler.handleAddWater(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('🥤 Что ты выпил(а)?'),
                expect.any(Object)
            );
            expect(KeyboardUtil.getDrinkTypeKeyboard).toHaveBeenCalled();
        });
    });

    describe('handleStats', () => {
        it('should show stats period keyboard', async () => {
            await CommandHandler.handleStats(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('📊 За какой период'),
                expect.any(Object)
            );
            expect(KeyboardUtil.getStatsKeyboard).toHaveBeenCalled();
        });
    });

    describe('handleSettings', () => {
        it('should show settings for existing user', async () => {
            const mockUser = { chatId: mockChatId };
            const mockMessageResponse = { message_id: 1 };
            dbService.getUser = jest.fn().mockResolvedValue(mockUser);
            telegramService.sendMessage = jest.fn().mockResolvedValue(mockMessageResponse);

            await CommandHandler.handleSettings(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('⚙️ Настройки:'),
                expect.any(Object)
            );
            expect(telegramService.editMessage).toHaveBeenCalled();
        });

        it('should handle error when user not found', async () => {
            dbService.getUser = jest.fn().mockResolvedValue(null);

            await CommandHandler.handleSettings(mockMessage);

            expect(telegramService.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('handleHelp', () => {
        it('should send help message', async () => {
            await CommandHandler.handleHelp(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('🚰 *Помощь по использованию бота*'),
                expect.objectContaining({ parse_mode: 'Markdown' })
            );
        });
    });

    describe('handleDebug', () => {
        it('should send test notification for admin', async () => {
            const mockUser = { chatId: mockChatId };
            config.adminIds = [mockChatId];
            dbService.getUser = jest.fn().mockResolvedValue(mockUser);

            await CommandHandler.handleDebug(mockMessage);

            expect(notificationService.sendReminder).toHaveBeenCalledWith(mockUser);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('✅ Тестовое уведомление отправлено')
            );
        });

        it('should handle unauthorized access', async () => {
            config.adminIds = [999999]; // другой ID

            await CommandHandler.handleDebug(mockMessage);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                expect.stringContaining('⛔️ У вас нет прав')
            );
        });
    });
});

const CallbackHandler = require('../../src/handlers/callback.handler');
const telegramService = require('../../tests/mocks/telegram.service.mock');
const dbService = require('../../src/services/database.service');
const notificationService = require('../../src/services/notification.service');
const KeyboardUtil = require('../../src/utils/keyboard.util');
const ValidationUtil = require('../../src/utils/validation.util');
const KEYBOARD = require('../../src/config/keyboard.config');
const MESSAGE = require('../../src/config/message.config');
const config = require('../../src/config/config');

// Мокаем все зависимости
jest.mock('../../src/services/telegram.service', () => require('../../tests/mocks/telegram.service.mock'));
jest.mock('../../src/services/database.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/utils/keyboard.util');
jest.mock('../../src/utils/validation.util');

describe('CallbackHandler', () => {
    const mockChatId = 123456;
    const mockMessageId = 789;
    const mockQuery = {
        id: 'query123',
        message: {
            chat: { id: mockChatId },
            message_id: mockMessageId
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Подавляем вывод console.error во время тестов
        jest.spyOn(console, 'error').mockImplementation(() => {});
        KeyboardUtil.getMainKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        KeyboardUtil.getGoalKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        KeyboardUtil.getWaterAmountKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        KeyboardUtil.getOtherAmountKeyboard = jest.fn().mockReturnValue({ keyboard: [] });
        telegramService.getBot().answerCallbackQuery = jest.fn().mockResolvedValue(true);
        telegramService.sendMessage.mockClear();
    });

    afterEach(() => {
        // Восстанавливаем оригинальную функцию console.error
        jest.restoreAllMocks();
    });

    describe('handleCallback', () => {
        it('should handle goal callback', async () => {
            const query = { ...mockQuery, data: 'goal_2.5' };
            await CallbackHandler.handleCallback(query);
            expect(telegramService.getBot().answerCallbackQuery).toHaveBeenCalledWith(query.id);
        });

        it('should handle error gracefully', async () => {
            const query = { ...mockQuery, data: 'invalid_data' };
            CallbackHandler.handlers.goal = jest.fn().mockRejectedValue(new Error('Test error'));
            await CallbackHandler.handleCallback({ ...query, data: 'goal_invalid' });
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.general,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleGoalCallback', () => {
        it('should handle custom goal request', async () => {
            await CallbackHandler.handleGoalCallback(mockChatId, 'goal_custom', mockMessageId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.goal.set
            );
            expect(CallbackHandler.userTemp.get(mockChatId)).toEqual({ waitingFor: 'custom_goal' });
        });

        it('should set valid goal', async () => {
            const goal = '2.5';
            ValidationUtil.isValidGoal = jest.fn().mockReturnValue(true);

            await CallbackHandler.handleGoalCallback(mockChatId, `goal_${goal}`, mockMessageId);

            expect(dbService.addUser).toHaveBeenCalledWith(mockChatId, 2.5);
            expect(notificationService.updateUserReminder).toHaveBeenCalledWith(mockChatId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.success.goalSet(2.5),
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleDrinkIntake', () => {
        it('should handle custom water amount request', async () => {
            await CallbackHandler.handleDrinkIntake(mockChatId, 'custom', KEYBOARD.drinks.water.id);
            
            expect(telegramService.sendMessage).toHaveBeenCalled();
            expect(CallbackHandler.userTemp.get(mockChatId)).toEqual({ 
                waitingFor: `custom_${KEYBOARD.drinks.water.id}` 
            });
        });

        it('should add valid water intake', async () => {
            const amount = '0.5';
            ValidationUtil.isValidAmount = jest.fn().mockReturnValue(true);
            dbService.getDailyWaterIntake = jest.fn().mockResolvedValue(1.5);
            dbService.getUser = jest.fn().mockResolvedValue({ daily_goal: 2.5 });

            await CallbackHandler.handleDrinkIntake(mockChatId, amount);

            expect(dbService.addWaterIntake).toHaveBeenCalledWith(
                mockChatId, 
                0.5, 
                KEYBOARD.drinks.water.id
            );
        });

        it('should handle invalid amount', async () => {
            ValidationUtil.isValidAmount = jest.fn().mockReturnValue(false);

            await CallbackHandler.handleDrinkIntake(mockChatId, '10');

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.validation.amount(
                    config.validation.water.minAmount,
                    config.validation.water.maxAmount
                )
            );
            expect(dbService.addWaterIntake).not.toHaveBeenCalled();
        });
    });

    describe('handleStatsCallback', () => {
        it('should show daily stats', async () => {
            const period = KEYBOARD.periods.today.id;
            dbService.getUser = jest.fn().mockResolvedValue({ daily_goal: 2.5 });
            dbService.getDailyWaterIntake = jest.fn().mockResolvedValue(1.5);

            await CallbackHandler.handleStatsCallback(mockChatId, `stats_${period}`, mockMessageId);

            expect(telegramService.deleteMessage).toHaveBeenCalledWith(mockChatId, mockMessageId);
            expect(telegramService.sendMessage).toHaveBeenCalled();
        });

        it('should handle stats error', async () => {
            dbService.getUser = jest.fn().mockRejectedValue(new Error('DB Error'));

            await CallbackHandler.handleStatsCallback(mockChatId, 'stats_today', mockMessageId);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.stats,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleSettingsCallback', () => {
        it('should handle goal setting', async () => {
            await CallbackHandler.handleSettingsCallback(
                mockChatId,
                `settings_${KEYBOARD.settings.goal.id}`,
                mockMessageId
            );

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.goal.custom,
                KeyboardUtil.getGoalKeyboard()
            );
        });

        it('should handle unknown setting', async () => {
            await CallbackHandler.handleSettingsCallback(
                mockChatId,
                'settings_unknown',
                mockMessageId
            );

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.default,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleResetConfirmCallback', () => {
        it('should reset user data when confirmed', async () => {
            await CallbackHandler.handleResetConfirmCallback(
                mockChatId,
                `reset-confirm_${KEYBOARD.reset.confirm.id}`,
                mockMessageId
            );

            expect(dbService.deleteUser).toHaveBeenCalledWith(mockChatId);
            expect(notificationService.cancelUserReminders).toHaveBeenCalledWith(mockChatId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.success.reset
            );
        });

        it('should handle reset cancellation', async () => {
            await CallbackHandler.handleResetConfirmCallback(
                mockChatId,
                `reset-confirm_${KEYBOARD.reset.cancel.id}`,
                mockMessageId
            );

            expect(dbService.deleteUser).not.toHaveBeenCalled();
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.reset.cancel,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });
});

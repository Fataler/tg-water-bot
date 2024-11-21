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
jest.mock('../../src/services/telegram.service', () =>
    require('../../tests/mocks/telegram.service.mock')
);
jest.mock('../../src/services/database.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/utils/keyboard.util');
jest.mock('../../src/utils/validation.util');
jest.mock('../../src/config/message.config', () => ({
    errors: {
        general: 'Error message',
        stats: 'Stats error message',
        validation: {
            amount: (min, max) => `Amount should be between ${min} and ${max}`,
        },
    },
    prompts: {
        goal: {
            set: 'Set goal message',
            custom: 'Custom goal message',
        },
        reset: {
            cancel: 'Reset cancelled message',
        },
        default: 'Default message',
    },
    success: {
        goalSet: (goal) => `Goal set to ${goal}`,
        reset: 'Reset success message',
    },
    stats: {
        message: jest.fn(),
    },
}));

describe('CallbackHandler', () => {
    const mockChatId = 123456;
    const mockMessageId = 789;
    const mockQuery = {
        id: 'query123',
        message: {
            chat: { id: mockChatId },
            message_id: mockMessageId,
        },
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
            expect(notificationService.scheduleReminders).toHaveBeenCalledWith(mockChatId);
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
                waitingFor: `custom_${KEYBOARD.drinks.water.id}`,
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
        const mockStats = {
            water: 1.0,
            other: 0.5,
            total: 1.5,
        };
        const mockUser = { daily_goal: 2.5 };

        beforeEach(() => {
            dbService.getUser = jest.fn().mockResolvedValue(mockUser);
            dbService.getDailyWaterIntake = jest.fn().mockResolvedValue(mockStats);
            dbService.getWeeklyWaterIntake = jest.fn().mockResolvedValue(mockStats);
            dbService.getMonthlyWaterIntake = jest.fn().mockResolvedValue(mockStats);
            dbService.getAllTimeWaterIntake = jest.fn().mockResolvedValue(mockStats);
        });

        it('should show daily stats', async () => {
            const period = KEYBOARD.periods.today.id;
            const mockMessage = 'Mock daily stats';
            MESSAGE.stats.message = jest.fn().mockReturnValue(mockMessage);

            await CallbackHandler.handleStatsCallback(mockChatId, `stats_${period}`, mockMessageId);

            expect(dbService.getDailyWaterIntake).toHaveBeenCalled();
            expect(telegramService.deleteMessage).toHaveBeenCalledWith(mockChatId, mockMessageId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                mockMessage,
                KeyboardUtil.getMainKeyboard()
            );
        });

        it('should show weekly stats', async () => {
            const period = KEYBOARD.periods.week.id;
            const mockMessage = 'Mock weekly stats';
            MESSAGE.stats.message = jest.fn().mockReturnValue(mockMessage);

            await CallbackHandler.handleStatsCallback(mockChatId, `stats_${period}`, mockMessageId);

            expect(dbService.getWeeklyWaterIntake).toHaveBeenCalled();
            expect(telegramService.deleteMessage).toHaveBeenCalledWith(mockChatId, mockMessageId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                mockMessage,
                KeyboardUtil.getMainKeyboard()
            );
        });

        it('should show monthly stats', async () => {
            const period = KEYBOARD.periods.month.id;
            const mockMessage = 'Mock monthly stats';
            MESSAGE.stats.message = jest.fn().mockReturnValue(mockMessage);

            await CallbackHandler.handleStatsCallback(mockChatId, `stats_${period}`, mockMessageId);

            expect(dbService.getMonthlyWaterIntake).toHaveBeenCalled();
            expect(telegramService.deleteMessage).toHaveBeenCalledWith(mockChatId, mockMessageId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                mockMessage,
                KeyboardUtil.getMainKeyboard()
            );
        });

        it('should show all time stats', async () => {
            const period = KEYBOARD.periods.all.id;
            const mockMessage = 'Mock all time stats';
            MESSAGE.stats.message = jest.fn().mockReturnValue(mockMessage);

            await CallbackHandler.handleStatsCallback(mockChatId, `stats_${period}`, mockMessageId);

            expect(dbService.getAllTimeWaterIntake).toHaveBeenCalled();
            expect(telegramService.deleteMessage).toHaveBeenCalledWith(mockChatId, mockMessageId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                mockMessage,
                KeyboardUtil.getMainKeyboard()
            );
        });

        it('should handle empty stats', async () => {
            const period = KEYBOARD.periods.today.id;
            const mockMessage = '❌ Нет данных для отображения статистики';

            dbService.getDailyWaterIntake = jest.fn().mockResolvedValue(null);
            MESSAGE.stats.message = jest.fn().mockReturnValue(mockMessage);

            await CallbackHandler.handleStatsCallback(mockChatId, `stats_${period}`, null);

            expect(telegramService.deleteMessage).not.toHaveBeenCalled();
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                mockMessage,
                KeyboardUtil.getMainKeyboard()
            );
        });

        it('should handle empty message', async () => {
            const period = KEYBOARD.periods.today.id;

            dbService.getDailyWaterIntake = jest.fn().mockResolvedValue({});
            MESSAGE.stats.message = jest.fn().mockReturnValue('');

            await CallbackHandler.handleStatsCallback(mockChatId, `stats_${period}`, mockMessageId);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.stats,
                KeyboardUtil.getMainKeyboard()
            );
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
                `resetConfirm_${KEYBOARD.reset.confirm.id}`,
                mockMessageId
            );

            expect(dbService.deleteUser).toHaveBeenCalledWith(mockChatId);
            expect(notificationService.cancelReminders).toHaveBeenCalledWith(mockChatId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.success.reset
            );
        });

        it('should handle reset cancellation', async () => {
            await CallbackHandler.handleResetConfirmCallback(
                mockChatId,
                `resetConfirm_${KEYBOARD.reset.cancel.id}`,
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

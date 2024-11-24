const TelegramServiceMock = require('../mocks/telegram.service.mock');
const DatabaseServiceMock = require('../mocks/database.service.mock');
const NotificationServiceMock = require('../mocks/notification.service.mock');
const KeyboardUtil = require('../../src/utils/keyboard.util');
const MESSAGE = require('../../src/config/message.config');
const KEYBOARD = require('../../src/config/keyboard.config');
const config = require('../../src/config/config');

// Мокаем модули
jest.mock('../../src/services/telegram.service');
jest.mock('../../src/services/database.service');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/utils/validation.util');

describe('CallbackHandler', () => {
    let callbackHandler;
    let telegramService;
    let databaseService;
    let notificationService;
    let ValidationUtil;
    
    const mockChatId = 123456789;
    const mockQuery = {
        id: 'query123',
        message: {
            chat: {
                id: mockChatId
            },
            message_id: 1
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules();
        
        // Mock the services
        jest.mock('../../src/services/telegram.service');
        jest.mock('../../src/services/database.service');
        jest.mock('../../src/services/notification.service');
        jest.mock('../../src/utils/validation.util');
        
        // Get fresh service instances
        telegramService = require('../../src/services/telegram.service');
        databaseService = require('../../src/services/database.service');
        notificationService = require('../../src/services/notification.service');
        ValidationUtil = require('../../src/utils/validation.util');
        
        // Configure basic mocks
        telegramService.getBot = jest.fn().mockReturnValue({
            answerCallbackQuery: jest.fn().mockResolvedValue(true)
        });
        telegramService.sendMessage = jest.fn().mockResolvedValue(true);
        telegramService.editMessageText = jest.fn().mockResolvedValue(true);
        telegramService.onCallback = jest.fn();

        // Mock database methods
        databaseService.getUser = jest.fn();
        databaseService.addUser = jest.fn();
        databaseService.updateUser = jest.fn();
        databaseService.deleteUser = jest.fn();
        databaseService.addWaterIntake = jest.fn();
        databaseService.getDailyWaterIntake = jest.fn();
        databaseService.getWeeklyWaterIntake = jest.fn();

        // Mock notification methods
        notificationService.scheduleReminders = jest.fn();
        notificationService.cancelReminders = jest.fn();

        // Mock validation methods
        ValidationUtil.isValidAmount = jest.fn();
        
        // Get fresh handler instance
        callbackHandler = require('../../src/handlers/callback.handler');
    });

    describe('handleCallback', () => {
        it('should handle valid callback and answer query', async () => {
            const query = {
                id: 'query123',
                data: 'test_callback',
                message: {
                    chat: {
                        id: mockChatId
                    }
                }
            };

            await callbackHandler.handleCallback(query);

            expect(telegramService.getBot().answerCallbackQuery).toHaveBeenCalledWith(query.id);
        });

        it('should handle error and send error message', async () => {
            const query = {
                id: 'query123',
                data: 'invalid_callback',
                message: {
                    chat: {
                        id: mockChatId
                    }
                }
            };

            telegramService.getBot().answerCallbackQuery.mockRejectedValueOnce(new Error('Test error'));

            await callbackHandler.handleCallback(query);

            expect(telegramService.getBot().answerCallbackQuery).toHaveBeenCalledWith(query.id);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.general,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleGoalCallback', () => {
        it('should handle custom goal request', async () => {
            await callbackHandler.handleGoalCallback(mockChatId, 'goal_custom');
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.goal.set
            );
            expect(callbackHandler.userTemp.get(mockChatId)).toEqual({ waitingFor: 'custom_goal' });
        });

        it('should set numeric goal and schedule reminders', async () => {
            const goalValue = 2.5;
            
            await callbackHandler.handleGoalCallback(mockChatId, `goal_${goalValue}`);
            
            expect(databaseService.addUser).toHaveBeenCalledWith(mockChatId, goalValue);
            expect(notificationService.scheduleReminders).toHaveBeenCalledWith(mockChatId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.success.goalSet,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleDrinkTypeCallback', () => {
        it('should handle water drink type', async () => {
            await callbackHandler.handleDrinkTypeCallback(mockChatId, `drink_${KEYBOARD.drinks.water.id}`);
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.water.amount(
                    config.validation.water.minAmount,
                    config.validation.water.maxAmount
                ),
                KeyboardUtil.getWaterAmountKeyboard()
            );
        });

        it('should handle other drink type', async () => {
            await callbackHandler.handleDrinkTypeCallback(mockChatId, `drink_${KEYBOARD.drinks.other.id}`);
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.other.amount(
                    config.validation.water.minAmount,
                    config.validation.water.maxAmount
                ),
                KeyboardUtil.getOtherAmountKeyboard()
            );
        });
    });

    describe('handleStatsCallback', () => {
        const mockUser = {
            id: 1,
            daily_goal: 2.5,
            notification_enabled: 1
        };

        beforeEach(() => {
            databaseService.getUser.mockResolvedValue(mockUser);
        });

        it('should handle daily stats', async () => {
            const stats = { total: 1.5, count: 3 };
            databaseService.getDailyWaterIntake.mockResolvedValue(stats);
            
            await callbackHandler.handleStatsCallback(mockChatId, `stats_${KEYBOARD.periods.today.id}`);
            
            expect(databaseService.getDailyWaterIntake).toHaveBeenCalledWith(mockUser.id);
            expect(telegramService.sendMessage).toHaveBeenCalled();
        });

        it('should handle weekly stats', async () => {
            const stats = { total: 10.5, count: 21 };
            databaseService.getWeeklyWaterIntake.mockResolvedValue(stats);
            
            await callbackHandler.handleStatsCallback(mockChatId, `stats_${KEYBOARD.periods.week.id}`);
            
            expect(databaseService.getWeeklyWaterIntake).toHaveBeenCalledWith(mockUser.id);
            expect(telegramService.sendMessage).toHaveBeenCalled();
        });

        it('should handle error when user not found', async () => {
            databaseService.getUser.mockResolvedValue(null);
            
            await callbackHandler.handleStatsCallback(mockChatId, `stats_${KEYBOARD.periods.today.id}`);
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.errors.stats,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleSettingsCallback', () => {
        it('should handle goal setting', async () => {
            await callbackHandler.handleSettingsCallback(mockChatId, `settings_${KEYBOARD.settings.goal.id}`);

            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.goal.custom,
                KeyboardUtil.getGoalKeyboard()
            );
        });

        it('should handle enabling notifications', async () => {
            databaseService.getUser.mockResolvedValueOnce({ notification_enabled: 0 });

            await callbackHandler.handleSettingsCallback(mockChatId, `settings_${KEYBOARD.settings.notifications.id}`);

            expect(databaseService.updateUser).toHaveBeenCalledWith(mockChatId, { notification_enabled: 1 });
            expect(notificationService.scheduleReminders).toHaveBeenCalledWith(mockChatId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.notifications.enabled,
                KeyboardUtil.getMainKeyboard()
            );
        });

        it('should handle disabling notifications', async () => {
            databaseService.getUser.mockResolvedValueOnce({ notification_enabled: 1 });

            await callbackHandler.handleSettingsCallback(mockChatId, `settings_${KEYBOARD.settings.notifications.id}`);

            expect(databaseService.updateUser).toHaveBeenCalledWith(mockChatId, { notification_enabled: 0 });
            expect(notificationService.cancelReminders).toHaveBeenCalledWith(mockChatId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.notifications.disabled,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleResetCallback', () => {
        it('should send reset confirmation message', async () => {
            await callbackHandler.handleResetCallback(mockChatId);
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.reset.confirm,
                KeyboardUtil.getResetConfirmKeyboard()
            );
        });
    });

    describe('handleResetConfirmCallback', () => {
        it('should handle reset confirmation', async () => {
            await callbackHandler.handleResetConfirmCallback(mockChatId, `reset_${KEYBOARD.reset.confirm.id}`);
            
            expect(databaseService.deleteUser).toHaveBeenCalledWith(mockChatId);
            expect(notificationService.cancelReminders).toHaveBeenCalledWith(mockChatId);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.reset.success
            );
        });

        it('should handle reset cancellation', async () => {
            await callbackHandler.handleResetConfirmCallback(mockChatId, 'reset_cancel');
            
            expect(databaseService.deleteUser).not.toHaveBeenCalled();
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.reset.cancel,
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('handleDrinkIntake', () => {
        const mockUser = {
            id: mockChatId,
            daily_goal: 2.5,
            notification_enabled: 1
        };

        beforeEach(() => {
            ValidationUtil.isValidAmount.mockReset();
            databaseService.getUser.mockReset();
            databaseService.addWaterIntake.mockReset();
            databaseService.getDailyWaterIntake.mockReset();
            telegramService.sendMessage.mockReset();
        });

        it('should handle custom amount request', async () => {
            await callbackHandler.handleDrinkIntake(mockChatId, 'custom', KEYBOARD.drinks.water.id);
            
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.prompts.water.amount(
                    config.validation.water.minAmount,
                    config.validation.water.maxAmount
                )
            );
        });

        it('should handle valid amount', async () => {
            const amount = 0.5;
            const todayIntake = { total: 1.5 };
            databaseService.getUser.mockResolvedValueOnce(mockUser);
            databaseService.getDailyWaterIntake.mockResolvedValueOnce(todayIntake);
            databaseService.addWaterIntake.mockResolvedValueOnce(1); // Return lastInsertRowid
            ValidationUtil.isValidAmount.mockReturnValueOnce(true);
            
            await callbackHandler.handleDrinkIntake(mockChatId, amount, KEYBOARD.drinks.water.id);
            
            expect(databaseService.addWaterIntake).toHaveBeenCalledWith(mockChatId, amount, KEYBOARD.drinks.water.id);
            expect(databaseService.getDailyWaterIntake).toHaveBeenCalledWith(mockUser.id);
            expect(telegramService.sendMessage).toHaveBeenCalledWith(
                mockChatId,
                MESSAGE.success.waterAdded(amount, todayIntake, mockUser.daily_goal),
                KeyboardUtil.getMainKeyboard()
            );
        });
    });

    describe('setupHandler', () => {
        it('should set up callback handler', () => {
            callbackHandler.setupHandler();
            
            expect(telegramService.onCallback).toHaveBeenCalledWith(
                expect.any(Function)
            );
        });
    });
});

// Services
const telegramService = require('../services/telegram.service');
const databaseService = require('../services/database.service');
const notificationService = require('../services/notification.service');

// Utils
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');

// Config
const KEYBOARD = require('../config/keyboard.config');
const MESSAGE = require('../config/message.config');
const config = require('../config/config');
const logger = require('../config/logger.config');

/**
 * Обработчик callback-запросов от Telegram бота
 */
class CallbackHandler {
    constructor() {
        this.userTemp = new Map();
        this.handlers = {
            goal: this.handleGoalCallback.bind(this),
            water: this.handleWaterCallback.bind(this),
            other: this.handleOtherDrinkCallback.bind(this),
            drink: this.handleDrinkTypeCallback.bind(this),
            stats: this.handleStatsCallback.bind(this),
            settings: this.handleSettingsCallback.bind(this),
            reset: this.handleResetCallback.bind(this),
            'reset-confirm': this.handleResetConfirmCallback.bind(this),
        };
    }

    async handleCallback(query) {
        const chatId = query.message.chat.id;
        const data = query.data;

        try {
            const handlerName = data.includes('-') ? data.split('-')[0] : data.split('_')[0];
            if (this.handlers[handlerName]) {
                await this.handlers[handlerName](chatId, data);
            }
            await telegramService.getBot().answerCallbackQuery(query.id);
        } catch (error) {
            logger.error('Error in callback handler:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.general,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleGoalCallback(chatId, data) {
        const [, goal] = data.split('_');

        if (goal === 'custom') {
            await telegramService.sendMessage(chatId, MESSAGE.prompts.goal.set);
            this.userTemp.set(chatId, { waitingFor: 'custom_goal' });
            return;
        }

        const goalValue = parseFloat(goal);
        await databaseService.addUser(chatId, goalValue);
        await notificationService.scheduleReminders(chatId);
        await telegramService.sendMessage(
            chatId,
            MESSAGE.success.goalSet(goalValue),
            KeyboardUtil.getMainKeyboard()
        );
    }

    async handleDrinkTypeCallback(chatId, data) {
        const [, type] = data.split('_');

        try {
            switch (type) {
                case KEYBOARD.drinks.water.id: {
                    await telegramService.sendMessage(
                        chatId,
                        MESSAGE.prompts.water.amount(
                            config.validation.water.minAmount,
                            config.validation.water.maxAmount
                        ),
                        KeyboardUtil.getWaterAmountKeyboard()
                    );
                    break;
                }
                case KEYBOARD.drinks.other.id: {
                    await telegramService.sendMessage(
                        chatId,
                        MESSAGE.prompts.other.amount(
                            config.validation.water.minAmount,
                            config.validation.water.maxAmount
                        ),
                        KeyboardUtil.getOtherAmountKeyboard()
                    );
                    break;
                }
                default: {
                    logger.warn(`Unknown drink type: ${type}`);
                }
            }
        } catch (error) {
            logger.error('Error handling drink type:', error);
            await telegramService.sendMessage(chatId, MESSAGE.errors.general);
        }
    }

    async handleWaterCallback(chatId, data) {
        const [, amount] = data.split('_');
        await this.handleDrinkIntake(chatId, amount, KEYBOARD.drinks.water.id);
    }

    async handleOtherDrinkCallback(chatId, data) {
        const [, amount] = data.split('_');
        await this.handleDrinkIntake(chatId, amount, KEYBOARD.drinks.other.id);
    }

    async handleStatsCallback(chatId, data, messageId) {
        try {
            const period = data.split('_')[1];
            if (messageId) {
                await telegramService.deleteMessage(chatId, messageId);
            }
            const user = await databaseService.getUser(chatId);

            let stats;
            let messageType;

            switch (period) {
                case KEYBOARD.periods.today.id:
                    stats = await databaseService.getDailyWaterIntake(chatId);
                    messageType = MESSAGE.stats.today;
                    break;
                case KEYBOARD.periods.week.id:
                    stats = await databaseService.getWeeklyWaterIntake(chatId);
                    messageType = MESSAGE.stats.week;
                    break;
                case KEYBOARD.periods.month.id:
                    stats = await databaseService.getMonthlyWaterIntake(chatId);
                    messageType = MESSAGE.stats.month;
                    break;
                case KEYBOARD.periods.all.id:
                    stats = await databaseService.getAllTimeWaterIntake(chatId);
                    messageType = MESSAGE.stats.all;
                    break;
                default:
                    stats = await databaseService.getDailyWaterIntake(chatId);
                    messageType = MESSAGE.stats.today;
            }

            const message = MESSAGE.stats.message(messageType, stats, period, user.daily_goal);
            if (!message) {
                throw new Error('Empty stats message');
            }
            await telegramService.sendMessage(chatId, message, KeyboardUtil.getMainKeyboard());
        } catch (error) {
            logger.error('Error handling stats:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.stats,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleSettingsCallback(chatId, data) {
        const [, setting] = data.split('_');

        switch (setting) {
            case KEYBOARD.settings.goal.id: {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.prompts.goal.custom,
                    KeyboardUtil.getGoalKeyboard()
                );
                break;
            }
            case KEYBOARD.settings.notifications.id: {
                const user = await databaseService.getUser(chatId);
                const newNotificationState = !user.notification_enabled;

                await databaseService.updateUser(chatId, {
                    notification_enabled: newNotificationState ? 1 : 0,
                });

                if (newNotificationState) {
                    await notificationService.scheduleReminders(chatId);
                    await telegramService.sendMessage(
                        chatId,
                        MESSAGE.notifications.enabled,
                        KeyboardUtil.getMainKeyboard()
                    );
                } else {
                    await notificationService.cancelReminders(chatId);
                    await telegramService.sendMessage(
                        chatId,
                        MESSAGE.notifications.disabled,
                        KeyboardUtil.getMainKeyboard()
                    );
                }
                break;
            }
            default: {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.prompts.default,
                    KeyboardUtil.getMainKeyboard()
                );
            }
        }
    }

    async handleResetCallback(chatId) {
        await telegramService.sendMessage(
            chatId,
            MESSAGE.prompts.reset.confirm,
            KeyboardUtil.getResetConfirmKeyboard()
        );
    }

    async handleResetConfirmCallback(chatId, data) {
        const [, action] = data.split('_');

        if (action === KEYBOARD.reset.confirm.id) {
            await databaseService.deleteUser(chatId);
            await notificationService.cancelReminders(chatId);
            await telegramService.sendMessage(chatId, MESSAGE.success.reset);
        } else {
            await telegramService.sendMessage(
                chatId,
                MESSAGE.prompts.reset.cancel,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleDrinkIntake(chatId, amount, type = KEYBOARD.drinks.water.id) {
        try {
            if (amount === 'custom') {
                this.userTemp.set(chatId, { waitingFor: `custom_${type}` });
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.prompts.water.amount(
                        config.validation.water.minAmount,
                        config.validation.water.maxAmount
                    )
                );
                return;
            }

            const intakeAmount = parseFloat(amount);
            if (!ValidationUtil.isValidAmount(intakeAmount)) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.validation.amount(
                        config.validation.water.minAmount,
                        config.validation.water.maxAmount
                    )
                );
                return;
            }

            await databaseService.addWaterIntake(chatId, intakeAmount, type);
            const todayIntake = await databaseService.getDailyWaterIntake(chatId);
            const user = await databaseService.getUser(chatId);

            await telegramService.sendMessage(
                chatId,
                MESSAGE.success.waterAdded(intakeAmount, todayIntake, user.daily_goal),
                KeyboardUtil.getMainKeyboard()
            );
        } catch (error) {
            logger.error('Error handling drink intake:', error);
            await telegramService.sendMessage(chatId, MESSAGE.errors.general);
        }
    }

    setupHandler() {
        telegramService.onCallback(this.handleCallback.bind(this));
    }
}

module.exports = new CallbackHandler();

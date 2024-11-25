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
            resetConfirm: this.handleResetConfirmCallback.bind(this),
            adminStats: this.handleAdminStatsCallback.bind(this),
        };
    }

    async handleCallback(query) {
        const chatId = query.message.chat.id;
        const data = query.data;

        try {
            const user = await databaseService.getUser(chatId);
            if (user) {
                await databaseService.updateUserInfo(chatId, {
                    username: query.from.username,
                    first_name: query.from.first_name,
                    last_name: query.from.last_name,
                });
            }

            const handlerName = data.includes('-') ? data.split('-')[0] : data.split('_')[0];
            if (this.handlers[handlerName]) {
                await this.handlers[handlerName](chatId, data, query);
            }
        } catch (error) {
            logger.error('Error handling callback:', error);
            await telegramService.sendMessage(chatId, MESSAGE.errors.general);
        }
    }

    async handleGoalCallback(chatId, data, query) {
        const goal = parseFloat(data.split('_')[1]);

        await databaseService.addUser(chatId, goal, {
            username: query.from.username,
            first_name: query.from.first_name,
            last_name: query.from.last_name,
        });

        await telegramService.sendMessage(
            chatId,
            MESSAGE.success.goalSet,
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
                            config.validation.water.maxAmount,
                            KEYBOARD.drinks.water.id
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
                            config.validation.water.maxAmount,
                            KEYBOARD.drinks.other.id
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

    async handleStatsCallback(chatId, data, query) {
        try {
            const period = data.split('_')[1];
            const user = await databaseService.getUser(chatId);
            if (!user) {
                throw new Error('User not found');
            }

            let stats;
            let messageType;

            switch (period) {
                case KEYBOARD.periods.today.id:
                    stats = await databaseService.getDailyWaterIntake(user.id);
                    messageType = MESSAGE.stats.today;
                    break;
                case KEYBOARD.periods.week.id:
                    stats = await databaseService.getWeeklyWaterIntake(user.id);
                    messageType = MESSAGE.stats.week;
                    break;
                case KEYBOARD.periods.month.id:
                    stats = await databaseService.getMonthlyWaterIntake(user.id);
                    messageType = MESSAGE.stats.month;
                    break;
                case KEYBOARD.periods.all.id:
                    stats = await databaseService.getAllTimeWaterIntake(user.id);
                    messageType = MESSAGE.stats.all;
                    break;
                default:
                    stats = await databaseService.getDailyWaterIntake(user.id);
                    messageType = MESSAGE.stats.today;
            }

            if (!stats) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.getStats,
                    KeyboardUtil.getMainKeyboard()
                );
                return;
            }

            const message = MESSAGE.stats.message(messageType, stats, period, user.daily_goal);
            if (!message) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.getStats,
                    KeyboardUtil.getMainKeyboard()
                );
                return;
            }

            await telegramService.editMessageText(
                chatId,
                query.message.message_id,
                message,
                KeyboardUtil.getStatsKeyboard(period)
            );
        } catch (error) {
            logger.error('Error handling stats callback:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.getStats,
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
            await telegramService.sendMessage(
                chatId,
                MESSAGE.prompts.reset.success,
                KeyboardUtil.getMainKeyboard()
            );
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
                const message =
                    type === KEYBOARD.drinks.water.id
                        ? MESSAGE.prompts.water.amount(
                              config.validation.water.minAmount,
                              config.validation.water.maxAmount
                          )
                        : MESSAGE.prompts.other.amount(
                              config.validation.water.minAmount,
                              config.validation.water.maxAmount
                          );

                await telegramService.sendMessage(
                    chatId,
                    message,
                    KeyboardUtil.getCancelKeyboard()
                );
                return;
            }

            const user = await databaseService.getUser(chatId);
            if (!user) {
                throw new Error('User not found');
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

            await databaseService.addWaterIntake(user.id, intakeAmount, type);
            const todayIntake = await databaseService.getDailyWaterIntake(user.id);

            await telegramService.sendMessage(
                chatId,
                MESSAGE.success.waterAdded(intakeAmount, todayIntake, user.daily_goal, type),
                KeyboardUtil.getMainKeyboard()
            );
        } catch (error) {
            logger.error('Error handling drink intake:', error);
            await telegramService.sendMessage(chatId, MESSAGE.errors.general);
        }
    }

    async handleAdminStatsCallback(chatId, data, query) {
        try {
            const period = data.split('_')[1];
            const users = await databaseService.getAllUsers();
            let statsMessage = '';

            switch (period) {
                case KEYBOARD.adminStats.today.id:
                    statsMessage = MESSAGE.commands.adminStats.today;
                    break;
                case KEYBOARD.adminStats.week.id:
                    statsMessage = MESSAGE.commands.adminStats.week;
                    break;
                case KEYBOARD.adminStats.month.id:
                    statsMessage = MESSAGE.commands.adminStats.month;
                    break;
                default:
                    return;
            }

            let hasData = false;
            let activeUsers = 0;
            let totalWaterAll = 0;
            let totalOtherAll = 0;
            let userStatsMessage = '';

            for (const user of users) {
                const days =
                    period === KEYBOARD.adminStats.today.id
                        ? 1
                        : period === KEYBOARD.adminStats.week.id
                          ? 7
                          : 30;

                const drinks = await databaseService.getWaterIntakeHistory(user.id, days);
                if (drinks && drinks.length > 0) {
                    const totalWater = drinks.reduce((sum, day) => sum + day.water, 0);
                    const totalOther = drinks.reduce((sum, day) => sum + day.other, 0);

                    if (totalWater > 0 || totalOther > 0) {
                        hasData = true;
                        activeUsers++;
                        totalWaterAll += totalWater;
                        totalOtherAll += totalOther;

                        const userIdentifiers = [];
                        if (user.first_name) userIdentifiers.push(user.first_name);
                        if (user.last_name) userIdentifiers.push(user.last_name);
                        if (user.username) userIdentifiers.push(`@${user.username}`);
                        userIdentifiers.push(`[${user.chat_id}]`);

                        userStatsMessage += MESSAGE.commands.adminStats.userStats(
                            userIdentifiers.join(' | '),
                            totalWater.toFixed(2),
                            totalOther.toFixed(2)
                        );
                    }
                }
            }

            if (!hasData) {
                await telegramService.editMessageText(
                    chatId,
                    query.message.message_id,
                    MESSAGE.commands.adminStats.noData,
                    KeyboardUtil.getAdminStatsKeyboard(period)
                );
                return;
            }

            const message =
                statsMessage +
                MESSAGE.commands.adminStats.summary(
                    users.length,
                    activeUsers,
                    totalWaterAll.toFixed(2),
                    totalOtherAll.toFixed(2)
                ) +
                userStatsMessage;

            await telegramService.editMessageText(
                chatId,
                query.message.message_id,
                message,
                KeyboardUtil.getAdminStatsKeyboard(period)
            );
        } catch (error) {
            logger.error('Error handling admin stats callback:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.general,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    setupHandler() {
        const bot = telegramService.getBot();
        bot.on('callback_query', (query) => this.handleCallback(query));
    }
}

module.exports = new CallbackHandler();

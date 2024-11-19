const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');
const MessageUtil = require('../utils/message.util');
const config = require('../config/config');
const KEYBOARD = require('../config/keyboard.config');
const MESSAGE = require('../config/message.config');

class CallbackHandler {
    constructor() {
        this.userTemp = new Map();
    }

    handlers = {
        goal: (chatId, data, messageId) => this.handleGoalCallback(chatId, data, messageId),
        water: (chatId, data, messageId) => this.handleWaterCallback(chatId, data, messageId),
        other: (chatId, data, messageId) => this.handleOtherDrinkCallback(chatId, data, messageId),
        drink: (chatId, data, messageId) => this.handleDrinkTypeCallback(chatId, data, messageId),
        stats: (chatId, data, messageId) => this.handleStatsCallback(chatId, data, messageId),
        settings: (chatId, data, messageId) => this.handleSettingsCallback(chatId, data, messageId),
        reset: (chatId, data, messageId) => this.handleResetCallback(chatId, data, messageId),
        'reset-confirm': (chatId, data, messageId) => this.handleResetConfirmCallback(chatId, data, messageId),
    };

    async handleCallback(query) {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        try {
            const handlerName = data.includes('-') ? data.split('_')[0] : data.split('_')[0];
            if (this.handlers[handlerName]) {
                await this.handlers[handlerName](chatId, data, messageId);
            }

            await telegramService.getBot().answerCallbackQuery(query.id);
        } catch (error) {
            console.error('Error in callback handler:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.general,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleGoalCallback(chatId, data, messageId) {
        const goal = data.split('_')[1];

        if (goal === 'custom') {
            await telegramService.sendMessage(
                chatId,
                MESSAGE.prompts.goal.set
            );
            this.userTemp.set(chatId, { waitingFor: 'custom_goal' });
            return;
        }

        const numGoal = parseFloat(goal);
        if (ValidationUtil.isValidGoal(numGoal)) {
            await dbService.addUser(chatId, numGoal);
            await notificationService.updateUserReminder(chatId);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.success.goalSet(numGoal),
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleDrinkIntake(chatId, amount, type = KEYBOARD.drinks.water.id) {
        if (amount === 'custom') {
            const message = type === KEYBOARD.drinks.water.id
                ? MESSAGE.prompts.water.amount(config.validation.water.minAmount, config.validation.water.maxAmount)
                : MESSAGE.prompts.other.amount(config.validation.water.minAmount, config.validation.water.maxAmount);
            await telegramService.sendMessage(chatId, message);
            this.userTemp.set(chatId, { waitingFor: `custom_${type}` });
            return;
        }

        const numAmount = parseFloat(amount);
        if (!ValidationUtil.isValidAmount(numAmount)) {
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.validation.amount(config.validation.water.minAmount, config.validation.water.maxAmount)
            );
            return;
        }

        try {
            await dbService.addWaterIntake(chatId, numAmount, type);
            const dailyIntake = await dbService.getDailyWaterIntake(chatId);
            const user = await dbService.getUser(chatId);
            const goal = user.daily_goal;

            await notificationService.updateUserReminder(chatId);

            await telegramService.sendMessage(
                chatId,
                MESSAGE.success.waterAdded(numAmount, dailyIntake, goal),
                KeyboardUtil.getMainKeyboard()
            );
        } catch (error) {
            console.error('Error adding water intake:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.addWater,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleWaterCallback(chatId, data, messageId) {
        const [_, amount] = data.split('_');
        await telegramService.deleteMessage(chatId, messageId);
        await this.handleDrinkIntake(chatId, amount, KEYBOARD.drinks.water.id);
    }

    async handleOtherDrinkCallback(chatId, data, messageId) {
        const [_, amount] = data.split('_');
        await telegramService.deleteMessage(chatId, messageId);
        await this.handleDrinkIntake(chatId, amount, KEYBOARD.drinks.other.id);
    }

    async addWaterIntake(chatId, amount) {
        await this.handleDrinkIntake(chatId, amount.toString());
    }

    async handleStatsCallback(chatId, data, messageId) {
        try {
            const period = data.split('_')[1];
            await telegramService.deleteMessage(chatId, messageId);
            await this.showStats(chatId, period);
        } catch (error) {
            console.error('Error handling stats callback:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.stats,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleSettingsCallback(chatId, data, messageId) {
        const [_, setting] = data.split('_');

        switch (setting) {
            case KEYBOARD.settings.goal.id:
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.prompts.goal.custom,
                    KeyboardUtil.getGoalKeyboard()
                );
                break;
            default:
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.prompts.default,
                    KeyboardUtil.getMainKeyboard()
                );
        }
    }

    async handleResetCallback(chatId, data, messageId) {
        const confirmKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: KEYBOARD.reset.confirm.text, 
                            callback_data: `reset-confirm_${KEYBOARD.reset.confirm.id}` 
                        },
                        { 
                            text: KEYBOARD.reset.cancel.text, 
                            callback_data: `reset-confirm_${KEYBOARD.reset.cancel.id}` 
                        },
                    ],
                ],
            },
        };

        await telegramService.deleteMessage(chatId, messageId);
        await telegramService.sendMessage(
            chatId,
            MESSAGE.prompts.reset.confirm,
            confirmKeyboard
        );
    }

    async handleDrinkTypeCallback(chatId, data, messageId) {
        const type = data.split('_')[1];

        try {
            await telegramService.deleteMessage(chatId, messageId);

            if (type === KEYBOARD.drinks.water.id) {
                const message = await telegramService.sendMessage(
                    chatId,
                    MESSAGE.prompts.water.amount(config.validation.water.minAmount, config.validation.water.maxAmount),
                    KeyboardUtil.getWaterAmountKeyboard(0)
                );
                await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    MESSAGE.prompts.water.amount(config.validation.water.minAmount, config.validation.water.maxAmount),
                    KeyboardUtil.getWaterAmountKeyboard(message.message_id)
                );
            } else if (type === KEYBOARD.drinks.other.id) {
                const message = await telegramService.sendMessage(
                    chatId,
                    MESSAGE.prompts.other.amount(config.validation.water.minAmount, config.validation.water.maxAmount),
                    KeyboardUtil.getOtherAmountKeyboard(0)
                );
                await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    MESSAGE.prompts.other.amount(config.validation.water.minAmount, config.validation.water.maxAmount),
                    KeyboardUtil.getOtherAmountKeyboard(message.message_id)
                );
            }
        } catch (error) {
            console.error('Error handling drink type:', error);
            await telegramService.sendMessage(chatId, MESSAGE.errors.general);
        }
    }

    async handleStats(msg) {
        const chatId = msg.chat.id;
        const dailyIntake = await dbService.getDailyWaterIntake(chatId);
        const user = await dbService.getUser(chatId);
        const goal = user.daily_goal;

        let message = MESSAGE.stats.header;
        message += MessageUtil.formatDailyStats(dailyIntake, goal, { showEmoji: false });

        await telegramService.sendMessage(chatId, message);
    }

    async showStats(chatId, period) {
        try {
            const user = await dbService.getUser(chatId);
            let stats;
            let title;

            switch (period) {
                case KEYBOARD.periods.today.id:
                    stats = await dbService.getDailyWaterIntake(chatId);
                    title = MESSAGE.stats.today;
                    break;
                case KEYBOARD.periods.week.id:
                    stats = await dbService.getWaterIntakeHistory(chatId, 7);
                    title = MESSAGE.stats.week;
                    break;
                case KEYBOARD.periods.month.id:
                    stats = await dbService.getWaterIntakeHistory(chatId, 30);
                    title = MESSAGE.stats.month;
                    break;
                case KEYBOARD.periods.all.id:
                    stats = await dbService.getWaterStats(chatId);
                    title = MESSAGE.stats.all;
                    break;
            }

            const message = MESSAGE.stats.message(title, stats, period, user.daily_goal);
            await telegramService.sendMessage(chatId, message, KeyboardUtil.getMainKeyboard());
        } catch (error) {
            console.error('Error showing stats:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.stats,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleResetConfirmCallback(chatId, data, messageId) {
        const action = data.split('_')[1];
        await telegramService.deleteMessage(chatId, messageId);

        if (action === KEYBOARD.reset.confirm.id) {
            await dbService.deleteUser(chatId);
            notificationService.cancelUserReminders(chatId);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.success.reset
            );
        } else {
            await telegramService.sendMessage(
                chatId,
                MESSAGE.prompts.reset.cancel,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    setupHandler() {
        telegramService.onCallback(this.handleCallback.bind(this));
    }
}

module.exports = new CallbackHandler();

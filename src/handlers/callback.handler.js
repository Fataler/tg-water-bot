const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');
const MessageUtil = require('../utils/message.util');
const config = require('../config/config');

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
    };

    async handleCallback(query) {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        try {
            const handlerName = data.split('_')[0];

            if (this.handlers[handlerName]) {
                await this.handlers[handlerName](chatId, data, messageId);
            }

            // Отвечаем на callback query, чтобы убрать часики
            await telegramService.getBot().answerCallbackQuery(query.id);
        } catch (error) {
            console.error('Error in callback handler:', error);
            await telegramService.sendMessage(
                chatId,
                'Произошла ошибка. Попробуйте еще раз.',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleGoalCallback(chatId, data, messageId) {
        const goal = data.split('_')[1];

        if (goal === 'custom') {
            await telegramService.sendMessage(
                chatId,
                '🎯 Сколько литров воды в день ты хочешь выпивать? (например: 2.5л):'
            );
            this.userTemp.set(chatId, { waitingFor: 'custom_goal' });
            return;
        }

        const numGoal = parseFloat(goal);
        if (ValidationUtil.isValidGoal(numGoal)) {
            await dbService.addUser(chatId, numGoal);

            // Запускаем умные напоминания
            await notificationService.updateUserReminder(chatId);

            await telegramService.sendMessage(
                chatId,
                MessageUtil.formatGoalSetMessage(numGoal),
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleDrinkIntake(chatId, amount, type = 'water') {
        if (amount === 'custom') {
            const message =
                type === 'water'
                    ? `💧 Сколько литров воды ты выпил(а)? (от ${config.validation.water.minAmount} до ${config.validation.water.maxAmount}л):`
                    : `🥤 Сколько литров напитка ты выпил(а)? (от ${config.validation.water.minAmount} до ${config.validation.water.maxAmount}л):`;
            await telegramService.sendMessage(chatId, message);
            this.userTemp.set(chatId, { waitingFor: `custom_${type}` });
            return;
        }

        const numAmount = parseFloat(amount);
        if (!ValidationUtil.isValidAmount(numAmount)) {
            await telegramService.sendMessage(
                chatId,
                `⚠️ Количество должно быть от ${config.validation.water.minAmount} до ${config.validation.water.maxAmount} литров.`
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
                MessageUtil.formatWaterAddedMessage(numAmount, dailyIntake, goal),
                KeyboardUtil.getMainKeyboard()
            );
        } catch (error) {
            console.error('Error adding water intake:', error);
            await telegramService.sendMessage(
                chatId,
                '❌ Произошла ошибка при добавлении записи. Попробуйте еще раз.',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleWaterCallback(chatId, data, messageId) {
        const [_, amount] = data.split('_');
        await telegramService.deleteMessage(chatId, messageId);
        await this.handleDrinkIntake(chatId, amount, 'water');
    }

    async handleOtherDrinkCallback(chatId, data, messageId) {
        const [_, amount] = data.split('_');
        await telegramService.deleteMessage(chatId, messageId);
        await this.handleDrinkIntake(chatId, amount, 'other');
    }

    async addWaterIntake(chatId, amount) {
        await this.handleDrinkIntake(chatId, amount.toString());
    }

    async handleStatsCallback(chatId, data, messageId) {
        const [_, period] = data.split('_');

        await telegramService.deleteMessage(chatId, messageId);

        await this.showStats(chatId, period);
    }

    async handleSettingsCallback(chatId, data, messageId) {
        const [_, setting] = data.split('_');

        switch (setting) {
            case 'goal':
                await telegramService.sendMessage(
                    chatId,
                    'Сколько литров воды в день ты хочешь выпивать?',
                    KeyboardUtil.getGoalKeyboard()
                );
                break;
            default:
                await telegramService.sendMessage(
                    chatId,
                    'Используйте кнопки меню для взаимодействия с ботом.',
                    KeyboardUtil.getMainKeyboard()
                );
        }
    }

    async handleResetCallback(chatId, data, messageId) {
        const action = data.split('_')[1];
        if (action === 'confirm') {
            await dbService.deleteUser(chatId);
            notificationService.cancelUserReminders(chatId);
            await telegramService.sendMessage(
                chatId,
                'Все настройки сброшены. Напиши /start чтобы начать заново'
            );
        } else {
            await telegramService.sendMessage(
                chatId,
                'Сброс настроек отменен',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleDrinkTypeCallback(chatId, data, messageId) {
        const type = data.split('_')[1];

        try {
            // Удаляем сообщение с выбором типа напитка
            await telegramService.deleteMessage(chatId, messageId);

            if (type === 'water') {
                const message = await telegramService.sendMessage(
                    chatId,
                    'Сколько литров воды ты выпил(а)?',
                    KeyboardUtil.getWaterAmountKeyboard()
                );
                const editedMessage = await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    'Сколько литров воды ты выпил(а)?',
                    KeyboardUtil.getWaterAmountKeyboard(message.message_id)
                );
            } else if (type === 'other') {
                const message = await telegramService.sendMessage(
                    chatId,
                    'Сколько литров напитка ты выпил(а)?',
                    KeyboardUtil.getOtherDrinkAmountKeyboard()
                );
                const editedMessage = await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    'Сколько литров напитка ты выпил(а)?',
                    KeyboardUtil.getOtherDrinkAmountKeyboard(message.message_id)
                );
            }
        } catch (error) {
            console.error('Error handling drink type:', error);
            await telegramService.sendMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
        }
    }

    async handleStats(msg) {
        const chatId = msg.chat.id;
        const dailyIntake = await dbService.getDailyWaterIntake(chatId);
        const user = await dbService.getUser(chatId);
        const goal = user.daily_goal;

        let message = '📊 Статистика потребления жидкости:\n\n';
        message += MessageUtil.formatDailyStats(dailyIntake, goal, { showEmoji: false });

        await telegramService.sendMessage(chatId, message);
    }

    async showStats(chatId, period) {
        try {
            const user = await dbService.getUser(chatId);
            let stats;
            let title;

            switch (period) {
                case 'today':
                    stats = await dbService.getDailyWaterIntake(chatId);
                    title = 'Статистика за сегодня';
                    break;
                case 'week':
                    stats = await dbService.getWaterIntakeHistory(chatId, 7);
                    title = 'Статистика за неделю';
                    break;
                case 'month':
                    stats = await dbService.getWaterIntakeHistory(chatId, 30);
                    title = 'Статистика за месяц';
                    break;
                case 'all':
                    stats = await dbService.getWaterStats(chatId);
                    title = 'Общая статистика';
                    break;
            }

            const message = MessageUtil.formatStatsMessage(title, stats, period, user.daily_goal);
            await telegramService.sendMessage(chatId, message, KeyboardUtil.getMainKeyboard());
        } catch (error) {
            console.error('Error showing stats:', error);
            await telegramService.sendMessage(
                chatId,
                'Произошла ошибка при получении статистики. Попробуйте еще раз.',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    setupHandler() {
        telegramService.onCallback(this.handleCallback.bind(this));
    }
}

module.exports = new CallbackHandler();

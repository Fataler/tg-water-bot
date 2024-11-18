const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');
const config = require('../config/config');

class CallbackHandler {
    constructor() {
        this.userTemp = new Map();
    }

    handlers = {
        goal: () => this.handleGoalCallback(chatId, data),
        water: () => this.handleWaterCallback(chatId, data),
        stats: () => this.handleStatsCallback(chatId, data),
        settings: () => this.handleSettingsCallback(chatId, data),
        time: () => this.handleTimeCallback(chatId, data),
        reset: () => this.handleResetCallback(chatId, data),
    };

    async handleCallback(query) {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        try {
            const handlerName = data.split('_')[0];

            if (handlers[handlerName]) {
                await handlers[handlerName]();
            }

            // Отвечаем на callback query, чтобы убрать часики
            await telegramService.getBot().answerCallbackQuery(query.id);
        } catch (error) {
            console.error('Error handling callback:', error);
            await telegramService.sendMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
        }
    }

    async handleGoalCallback(chatId, data) {
        const goal = data.split('_')[1];
        
        if (goal === 'custom') {
            await telegramService.sendMessage(chatId, 'Введите желаемую цель в литрах (например: 2.5):');
            this.userTemp.set(chatId, { waitingFor: 'custom_goal' });
            return;
        }

        const numGoal = parseFloat(goal);
        if (ValidationUtil.isValidGoal(numGoal)) {
            const user = await dbService.getUser(chatId);
            if (user) {
                // Если пользователь уже существует, обновляем только цель
                await dbService.addUser(chatId, numGoal, user.notification_time);
                await telegramService.sendMessage(
                    chatId,
                    'Цель успешно обновлена!',
                    KeyboardUtil.getMainKeyboard()
                );
            } else {
                // Если это новый пользователь, запрашиваем время уведомлений
                await dbService.addUser(chatId, numGoal, '12:00');
                await telegramService.sendMessage(
                    chatId,
                    'Отлично! Теперь выберите время для напоминаний:',
                    KeyboardUtil.createTimeKeyboard()
                );
            }
        }
    }

    async handleWaterCallback(chatId, data) {
        const amount = data.split('_')[1];
        
        if (amount === 'custom') {
            await telegramService.sendMessage(chatId, 'Введите количество воды в литрах (например: 0.5):');
            this.userTemp.set(chatId, { waitingFor: 'custom_water' });
            return;
        }

        const numAmount = parseFloat(amount);
        if (ValidationUtil.isValidWaterAmount(numAmount)) {
            await this.addWaterIntake(chatId, numAmount);
        }
    }

    async handleStatsCallback(chatId, data) {
        const period = data.split('_')[1];
        await this.showStats(chatId, period);
    }

    async handleSettingsCallback(chatId, data) {
        const setting = data.split('_')[1];
        const value = data.split('_')[2];

        switch (setting) {
            case 'goal':
                await telegramService.sendMessage(
                    chatId,
                    'Выберите новую цель:',
                    KeyboardUtil.getGoalKeyboard()
                );
                break;
            case 'time':
                await telegramService.sendMessage(
                    chatId,
                    'Выберите новое время для напоминаний:',
                    KeyboardUtil.createTimeKeyboard()
                );
                break;
            case 'notifications':
                const status = value === 'true';
                await dbService.updateDoNotDisturb(chatId, !status);
                if (status) {
                    await notificationService.updateUserReminder(chatId);
                } else {
                    notificationService.cancelUserReminders(chatId);
                }
                await telegramService.sendMessage(
                    chatId,
                    status ? 'Уведомления включены' : 'Уведомления отключены',
                    KeyboardUtil.getMainKeyboard()
                );
                break;
        }
    }

    async handleTimeCallback(chatId, data) {
        const time = data.split('_')[1];
        if (ValidationUtil.isValidTime(time)) {
            const user = await dbService.getUser(chatId);
            await dbService.addUser(chatId, user ? user.daily_goal : config.validation.water.defaultGoal, time);
            await notificationService.updateUserReminder(chatId);
            await telegramService.sendMessage(
                chatId,
                user ? 'Время напоминаний обновлено!' : 'Настройка завершена! Теперь вы можете отслеживать потребление воды.',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleResetCallback(chatId, data) {
        const action = data.split('_')[1];
        if (action === 'confirm') {
            await dbService.deleteUser(chatId);
            notificationService.cancelUserReminders(chatId);
            await telegramService.sendMessage(
                chatId,
                'Все настройки сброшены. Для начала работы введите /start'
            );
        } else {
            await telegramService.sendMessage(
                chatId,
                'Сброс настроек отменен',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async addWaterIntake(chatId, amount) {
        try {
            await dbService.addWaterIntake(chatId, amount);
            const user = await dbService.getUser(chatId);
            const dailyIntake = await dbService.getDailyWaterIntake(chatId, new Date());
            const percentage = ValidationUtil.formatPercentage(dailyIntake, user.daily_goal);
            const progressBar = ValidationUtil.createProgressBar(percentage);

            const message = `✅ Добавлено: ${ValidationUtil.formatWaterAmount(amount)}\n\n` +
                          `Сегодня выпито: ${ValidationUtil.formatWaterAmount(dailyIntake)}\n` +
                          `Цель: ${ValidationUtil.formatWaterAmount(user.daily_goal)}\n` +
                          `Прогресс: ${percentage}%\n${progressBar}`;

            await telegramService.sendMessage(chatId, message, KeyboardUtil.getMainKeyboard());
        } catch (error) {
            console.error('Error adding water intake:', error);
            await telegramService.sendMessage(
                chatId,
                'Произошла ошибка при добавлении воды. Попробуйте еще раз.',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async showStats(chatId, period) {
        try {
            const user = await dbService.getUser(chatId);
            let stats;
            let title;

            switch (period) {
                case 'today':
                    stats = await dbService.getDailyWaterIntake(chatId, new Date());
                    title = 'Статистика за сегодня';
                    break;
                case 'week':
                    stats = await dbService.getWaterHistory(chatId, 7);
                    title = 'Статистика за неделю';
                    break;
                case 'month':
                    stats = await dbService.getWaterHistory(chatId, 30);
                    title = 'Статистика за месяц';
                    break;
                case 'all':
                    stats = await dbService.getWaterStats(chatId);
                    title = 'Общая статистика';
                    break;
            }

            const message = this.formatStatsMessage(title, stats, period, user.daily_goal);
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

    formatStatsMessage(title, stats, period, dailyGoal) {
        let message = `📊 ${title}\n\n`;

        if (period === 'today') {
            const percentage = ValidationUtil.formatPercentage(stats, dailyGoal);
            const progressBar = ValidationUtil.createProgressBar(percentage);
            message += `Выпито: ${ValidationUtil.formatWaterAmount(stats)}\n` +
                      `Цель: ${ValidationUtil.formatWaterAmount(dailyGoal)}\n` +
                      `Прогресс: ${percentage}%\n${progressBar}`;
        } else if (period === 'all') {
            message += `Всего выпито: ${ValidationUtil.formatWaterAmount(stats.total)}\n` +
                      `Среднее в день: ${ValidationUtil.formatWaterAmount(stats.average)}\n` +
                      `Лучший день: ${ValidationUtil.formatWaterAmount(stats.max)}\n` +
                      `Дней отслеживания: ${stats.days}`;
        } else {
            // week or month
            message += `Всего выпито: ${ValidationUtil.formatWaterAmount(stats.total)}\n` +
                      `Среднее в день: ${ValidationUtil.formatWaterAmount(stats.average)}\n` +
                      `Лучший день: ${ValidationUtil.formatWaterAmount(stats.max)} (${stats.maxDate})\n` +
                      `Дней с записями: ${stats.daysWithRecords} из ${stats.totalDays}`;
        }

        return message;
    }

    setupHandler() {
        telegramService.onCallback(this.handleCallback.bind(this));
    }
}

module.exports = new CallbackHandler();

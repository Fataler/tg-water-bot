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
        goal: (chatId, data) => this.handleGoalCallback(chatId, data),
        water: (chatId, data) => this.handleWaterCallback(chatId, data),
        other: (chatId, data) => this.handleOtherDrinkCallback(chatId, data),
        drink: (chatId, data) => this.handleDrinkTypeCallback(chatId, data),
        stats: (chatId, data) => this.handleStatsCallback(chatId, data),
        settings: (chatId, data) => this.handleSettingsCallback(chatId, data),
        time: (chatId, data) => this.handleTimeCallback(chatId, data),
        reset: (chatId, data) => this.handleResetCallback(chatId, data)
    };

    async handleCallback(query) {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        try {
            const handlerName = data.split('_')[0];

            if (this.handlers[handlerName]) {
                await this.handlers[handlerName](chatId, data);
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
            await telegramService.sendMessage(chatId, 'Введите количество в литрах (например: 0.5):');
            this.userTemp.set(chatId, { waitingFor: 'custom_water' });
            return;
        }

        const numAmount = parseFloat(amount);
        if (!ValidationUtil.isValidAmount(numAmount)) {
            await telegramService.sendMessage(chatId, 'Некорректное количество. Попробуйте еще раз.');
            return;
        }

        try {
            await dbService.addWaterIntake(chatId, numAmount, 'water');
            const dailyIntake = await dbService.getDailyWaterIntake(chatId);
            const user = await dbService.getUser(chatId);
            const goal = user.daily_goal;
            
            await telegramService.sendMessage(
                chatId,
                `✅ Добавлено ${numAmount}л воды!\n\n` +
                `💧 Вода: ${dailyIntake.water}л\n` +
                `🥤 Другие напитки: ${dailyIntake.other}л\n` +
                `📊 Всего: ${dailyIntake.total}л из ${goal}л`
            );
        } catch (error) {
            console.error('Error adding water:', error);
            await telegramService.sendMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
        }
    }

    async handleOtherDrinkCallback(chatId, data) {
        const amount = data.split('_')[1];
        
        if (amount === 'custom') {
            await telegramService.sendMessage(chatId, 'Введите количество в литрах (например: 0.5):');
            this.userTemp.set(chatId, { waitingFor: 'custom_other' });
            return;
        }

        const numAmount = parseFloat(amount);
        if (!ValidationUtil.isValidAmount(numAmount)) {
            await telegramService.sendMessage(chatId, 'Некорректное количество. Попробуйте еще раз.');
            return;
        }

        try {
            await dbService.addWaterIntake(chatId, numAmount, 'other');
            const dailyIntake = await dbService.getDailyWaterIntake(chatId);
            const user = await dbService.getUser(chatId);
            const goal = user.daily_goal;
            
            await telegramService.sendMessage(
                chatId,
                `✅ Добавлено ${numAmount}л другого напитка!\n\n` +
                `💧 Вода: ${dailyIntake.water}л\n` +
                `🥤 Другие напитки: ${dailyIntake.other}л\n` +
                `📊 Всего: ${dailyIntake.total}л из ${goal}л`
            );
        } catch (error) {
            console.error('Error adding other drink:', error);
            await telegramService.sendMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
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

    async handleDrinkTypeCallback(chatId, data) {
        const type = data.split('_')[1];
        
        if (type === 'water') {
            await telegramService.sendMessage(
                chatId,
                'Сколько воды ты выпил(а)?',
                KeyboardUtil.getWaterAmountKeyboard()
            );
        } else if (type === 'other') {
            await telegramService.sendMessage(
                chatId,
                'Сколько другого напитка ты выпил(а)?',
                KeyboardUtil.getOtherDrinkAmountKeyboard()
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
                    stats = await dbService.getDailyWaterIntake(chatId);
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

    async handleStats(msg) {
        const chatId = msg.chat.id;
        const dailyIntake = await dbService.getDailyWaterIntake(chatId);
        const user = await dbService.getUser(chatId);
        const goal = user.daily_goal;
        
        let message = '📊 Статистика потребления жидкости:\n\n';
        message += `💧 Вода: ${dailyIntake.water}л\n`;
        message += `🥤 Другие напитки: ${dailyIntake.other}л\n`;
        message += `📊 Всего: ${dailyIntake.total}л из ${goal}л\n\n`;
        
        const percentage = Math.round((dailyIntake.total / goal) * 100);
        message += `Прогресс: ${percentage}%\n`;
        message += this.getProgressBar(percentage);
        
        await telegramService.sendMessage(chatId, message);
    }

    getProgressBar(percentage) {
        const filledCount = Math.floor(percentage / 10);
        const emptyCount = 10 - filledCount;
        return '🟦'.repeat(filledCount) + '⬜️'.repeat(emptyCount);
    }

    formatStatsMessage(title, stats, period, dailyGoal) {
        let message = `📊 ${title}\n\n`;

        if (period === 'today') {
            const percentage = ValidationUtil.formatPercentage(stats.total, dailyGoal);
            message += `💧 Вода: ${stats.water}л\n`;
            message += `🥤 Другие напитки: ${stats.other}л\n`;
            message += `📊 Всего: ${stats.total}л из ${dailyGoal}л\n`;
            message += `✨ Прогресс: ${percentage}%\n`;
            message += this.getProgressBar(percentage);
        } else {
            stats.forEach(day => {
                const date = new Date(day.date);
                const formattedDate = date.toLocaleDateString('ru-RU', { weekday: 'short', month: 'short', day: 'numeric' });
                message += `${formattedDate}:\n`;
                message += `💧 Вода: ${day.water}л\n`;
                message += `🥤 Другие: ${day.other}л\n`;
                message += `📊 Всего: ${day.total}л\n\n`;
            });
        }

        return message;
    }

    setupHandler() {
        telegramService.onCallback(this.handleCallback.bind(this));
    }
}

module.exports = new CallbackHandler();

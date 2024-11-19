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
        goal: (chatId, data, messageId) => this.handleGoalCallback(chatId, data, messageId),
        water: (chatId, data, messageId) => this.handleWaterCallback(chatId, data, messageId),
        other: (chatId, data, messageId) => this.handleOtherDrinkCallback(chatId, data, messageId),
        drink: (chatId, data, messageId) => this.handleDrinkTypeCallback(chatId, data, messageId),
        stats: (chatId, data, messageId) => this.handleStatsCallback(chatId, data, messageId),
        settings: (chatId, data, messageId) => this.handleSettingsCallback(chatId, data, messageId),
        reset: (chatId, data, messageId) => this.handleResetCallback(chatId, data, messageId)
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
            console.error('Error handling callback:', error);
            await telegramService.sendMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
        }
    }

    async handleGoalCallback(chatId, data, messageId) {
        const goal = data.split('_')[1];
        
        if (goal === 'custom') {
            await telegramService.sendMessage(chatId, '🎯 Введите желаемую цель в литрах (например: 2.5л):');
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
                '🎉 Отлично! Цель установлена!\n\n' +
                '🤖 Я буду отправлять тебе умные напоминания в течение дня:\n' +
                '🌅 Утром (30% от цели)\n' +
                '☀️ Днём (50% от цели)\n' +
                '🌆 Вечером (20% от цели)\n\n' +
                '💪 Давай начнем следить за твоим водным балансом! 💧',
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    async handleWaterCallback(chatId, data, messageId) {
        const [_, amount] = data.split('_');
        
        // Удаляем сообщение с выбором количества
        await telegramService.deleteMessage(chatId, messageId);
        
        if (amount === 'custom') {
            await telegramService.sendMessage(chatId, '💧 Введите количество в литрах (например: 0.5):');
            this.userTemp.set(chatId, { waitingFor: 'custom_water' });
            return;
        }

        const numAmount = parseFloat(amount);
        if (!ValidationUtil.isValidAmount(numAmount)) {
            await telegramService.sendMessage(chatId, '⚠️ Некорректное количество. Попробуйте еще раз.');
            return;
        }

        try {
            await dbService.addWaterIntake(chatId, numAmount, 'water');
            const dailyIntake = await dbService.getDailyWaterIntake(chatId);
            const user = await dbService.getUser(chatId);
            const goal = user.daily_goal;

            // Обновляем состояние напоминаний
            await notificationService.updateUserReminder(chatId);
            
            await telegramService.sendMessage(
                chatId,
                `🎯 Отлично! Добавлено ${ValidationUtil.formatWaterAmount(numAmount)}!\n\n` +
                `💧 Вода: ${ValidationUtil.formatWaterAmount(dailyIntake.water)}\n` +
                `🥤 Другие напитки: ${ValidationUtil.formatWaterAmount(dailyIntake.other)}\n` +
                `📊 Всего: ${ValidationUtil.formatWaterAmount(dailyIntake.total)} из ${ValidationUtil.formatWaterAmount(goal)}\n\n` +
                `${dailyIntake.total >= goal ? '🎉 Ты достиг(ла) дневной цели! Так держать! 💪' : '💪 Продолжай в том же духе!'}`,
                KeyboardUtil.getMainKeyboard()
            );
        } catch (error) {
            console.error('Error adding water:', error);
            await telegramService.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте еще раз.');
        }
    }

    async handleOtherDrinkCallback(chatId, data, messageId) {
        const [_, amount] = data.split('_');
        
        // Удаляем сообщение с выбором количества
        await telegramService.deleteMessage(chatId, messageId);
        
        if (amount === 'custom') {
            await telegramService.sendMessage(chatId, '🥤 Введите количество в литрах (например: 0.5):');
            this.userTemp.set(chatId, { waitingFor: 'custom_other' });
            return;
        }

        const numAmount = parseFloat(amount);
        if (!ValidationUtil.isValidAmount(numAmount)) {
            await telegramService.sendMessage(chatId, '⚠️ Некорректное количество. Попробуйте еще раз.');
            return;
        }

        try {
            await dbService.addWaterIntake(chatId, numAmount, 'other');
            const dailyIntake = await dbService.getDailyWaterIntake(chatId);
            const user = await dbService.getUser(chatId);
            const goal = user.daily_goal;

            // Обновляем состояние напоминаний
            await notificationService.updateUserReminder(chatId);
            
            await telegramService.sendMessage(
                chatId,
                `🎯 Отлично! Добавлено ${ValidationUtil.formatWaterAmount(numAmount)} другого напитка!\n\n` +
                `💧 Вода: ${ValidationUtil.formatWaterAmount(dailyIntake.water)}\n` +
                `🥤 Другие напитки: ${ValidationUtil.formatWaterAmount(dailyIntake.other)}\n` +
                `📊 Всего: ${ValidationUtil.formatWaterAmount(dailyIntake.total)} из ${ValidationUtil.formatWaterAmount(goal)}\n\n` +
                `${dailyIntake.total >= goal ? '🎉 Ты достиг(ла) дневной цели! Так держать! 💪' : '💪 Продолжай в том же духе!'}`,
                KeyboardUtil.getMainKeyboard()
            );
        } catch (error) {
            console.error('Error adding other drink:', error);
            await telegramService.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте еще раз.');
        }
    }

    async handleStatsCallback(chatId, data, messageId) {
        const [_, period] = data.split('_');
        
        // Удаляем сообщение с выбором периода
        await telegramService.deleteMessage(chatId, messageId);
        
        await this.showStats(chatId, period);
    }

    async handleSettingsCallback(chatId, data, messageId) {
        const [_, setting, value] = data.split('_');
        
        // Удаляем сообщение с настройками
        await telegramService.deleteMessage(chatId, messageId);

        switch (setting) {
            case 'goal':
                await telegramService.sendMessage(
                    chatId,
                    'Выберите новую цель:',
                    KeyboardUtil.getGoalKeyboard()
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

    async handleTimeCallback(chatId, data, messageId) {
        // Этот метод больше не нужен, но оставляем его пустым на случай,
        // если какие-то старые сообщения всё ещё содержат time_ колбэки
        await telegramService.deleteMessage(chatId, messageId);
        await telegramService.sendMessage(
            chatId,
            'Эта функция больше не поддерживается. Теперь бот сам определяет оптимальное время для напоминаний!',
            KeyboardUtil.getMainKeyboard()
        );
    }

    async handleResetCallback(chatId, data, messageId) {
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

    async handleDrinkTypeCallback(chatId, data, messageId) {
        const type = data.split('_')[1];
        
        try {
            // Удаляем сообщение с выбором типа напитка
            await telegramService.deleteMessage(chatId, messageId);
            
            if (type === 'water') {
                const message = await telegramService.sendMessage(
                    chatId,
                    'Выберите количество воды:',
                    KeyboardUtil.getWaterAmountKeyboard()
                );
                const editedMessage = await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    'Выберите количество воды:',
                    KeyboardUtil.getWaterAmountKeyboard(message.message_id)
                );
            } else if (type === 'other') {
                const message = await telegramService.sendMessage(
                    chatId,
                    'Выберите количество напитка:',
                    KeyboardUtil.getOtherDrinkAmountKeyboard()
                );
                const editedMessage = await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    'Выберите количество напитка:',
                    KeyboardUtil.getOtherDrinkAmountKeyboard(message.message_id)
                );
            }
        } catch (error) {
            console.error('Error handling drink type:', error);
            await telegramService.sendMessage(chatId, 'Произошла ошибка. Попробуйте еще раз.');
        }
    }

    async addWaterIntake(chatId, amount) {
        try {
            await dbService.addWaterIntake(chatId, amount);
            const user = await dbService.getUser(chatId);
            const dailyIntake = await dbService.getDailyWaterIntake(chatId);
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
        message += `💧 Вода: ${ValidationUtil.formatWaterAmount(dailyIntake.water)}\n`;
        message += `🥤 Другие напитки: ${ValidationUtil.formatWaterAmount(dailyIntake.other)}\n`;
        message += `📊 Всего: ${ValidationUtil.formatWaterAmount(dailyIntake.total)} из ${ValidationUtil.formatWaterAmount(goal)}\n\n`;
        
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
            message += `💧 Вода: ${ValidationUtil.formatWaterAmount(stats.water)}\n`;
            message += `🥤 Другие напитки: ${ValidationUtil.formatWaterAmount(stats.other)}\n`;
            message += `📊 Всего: ${ValidationUtil.formatWaterAmount(stats.total)} из ${ValidationUtil.formatWaterAmount(dailyGoal)}\n`;
            message += `✨ Прогресс: ${percentage}%\n`;
            message += this.getProgressBar(percentage);
        } else if (period === 'all') {
            message += `📅 Дней ведения статистики: ${stats.days}\n`;
            message += `💧 Общий объем: ${ValidationUtil.formatWaterAmount(stats.total)}\n`;
            message += `📈 Среднее в день: ${stats.average.toFixed(2)}\n`;
            message += `🏆 Максимум за день: ${ValidationUtil.formatWaterAmount(stats.max)} (${stats.maxDate})\n`;
        } else {
            stats.forEach(day => {
                const date = new Date(day.date);
                const formattedDate = date.toLocaleDateString('ru-RU', { weekday: 'short', month: 'short', day: 'numeric' });
                message += `${formattedDate}:\n`;
                message += `💧 Вода: ${ValidationUtil.formatWaterAmount(day.water)}\n`;
                message += `🥤 Другие: ${ValidationUtil.formatWaterAmount(day.other)}\n`;
                message += `📊 Всего: ${ValidationUtil.formatWaterAmount(day.total)}\n\n`;
            });
        }

        return message;
    }

    setupHandler() {
        telegramService.onCallback(this.handleCallback.bind(this));
    }
}

module.exports = new CallbackHandler();

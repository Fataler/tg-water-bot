const schedule = require('node-schedule');
const config = require('../config/config');
const telegramService = require('./telegram.service');
const dbService = require('./database.service');
const ValidationUtil = require('../utils/validation.util');
const logger = require('../config/logger.config');

class NotificationService {
    constructor() {
        this.jobs = new Map();
    }

    async scheduleReminders() {
        try {
            logger.info('Scheduling reminders for all users');
            this.jobs.forEach((job) => job.cancel());
            this.jobs.clear();

            const users = await dbService.getAllUsers();
            users.forEach((user) => {
                if (user.notification_enabled) {
                    this.scheduleUserReminder(user);
                }
            });
        } catch (error) {
            logger.error('Error scheduling reminders:', error);
            throw error;
        }
    }

    getCurrentPeriod() {
        const hour = new Date().getHours();
        const { periods } = config.notifications;

        if (hour >= periods.morning.start && hour < periods.morning.end) return 'morning';
        if (hour >= periods.day.start && hour < periods.day.end) return 'day';
        if (hour >= periods.evening.start && hour < periods.evening.end) return 'evening';
        return null;
    }

    async shouldSendNotification(user, dailyIntake) {
        const now = new Date();
        const period = this.getCurrentPeriod();

        // Не отправляем уведомления ночью
        if (!period) {
            return false;
        }

        // Проверяем, достигнута ли дневная цель
        if (dailyIntake.total >= user.daily_goal) {
            return false;
        }

        // Проверяем минимальный интервал между уведомлениями
        if (user.last_notification) {
            const lastNotification = new Date(user.last_notification);
            const timeSinceLastNotification = now - lastNotification;

            if (timeSinceLastNotification < config.notifications.limits.minInterval) {
                return false;
            }
        }

        // Проверяем прогресс в текущем периоде
        const currentProgress = (dailyIntake.total / user.daily_goal) * 100;
        const expectedProgress = this.getExpectedProgress(period);

        const shouldSend = currentProgress < expectedProgress;
        return shouldSend;
    }

    getExpectedProgress(period) {
        const { periods } = config.notifications;
        let expected = 0;

        if (period === 'evening') {
            expected += periods.morning.targetPercent + periods.day.targetPercent;
        } else if (period === 'day') {
            expected += periods.morning.targetPercent;
        }

        const periodConfig = periods[period];
        const periodLength = periodConfig.end - periodConfig.start;
        const currentHour = new Date().getHours();
        const hoursIntoPeriod = currentHour - periodConfig.start;
        const periodProgress = hoursIntoPeriod / periodLength;

        expected += periodConfig.targetPercent * periodProgress;
        return expected;
    }

    async sendReminder(user, isTest = false) {
        try {
            const dailyIntake = await dbService.getDailyIntake(user.chat_id);
            const remainingWater = user.daily_goal - (dailyIntake?.total || 0);

            if (!isTest && !(await this.shouldSendNotification(user, dailyIntake))) {
                return;
            }

            const message = `💧 Не забудьте выпить воды!\n\nОсталось выпить: ${remainingWater}мл`;
            await telegramService.sendMessage(user.chat_id, message);
            await dbService.updateUser(user.chat_id, { last_notification: new Date() });
        } catch (error) {
            logger.error(`Error sending reminder to user ${user.chat_id}:`, error);
            throw error;
        }
    }

    scheduleUserReminder(user) {
        const times = ['12:00', '15:00', '18:00'];

        times.forEach((time) => {
            const [hours, minutes] = time.split(':').map(Number);

            const job = schedule.scheduleJob({ hour: hours, minute: minutes }, async () => {
                try {
                    const todayStats = await dbService.getTodayStats(user.chat_id);
                    const currentIntake = Math.round(todayStats.total * 1000); // конвертируем в мл
                    const goal = user.daily_goal * 1000; // конвертируем в мл

                    // Отправляем уведомление только если текущее потребление меньше цели
                    if (currentIntake < goal) {
                        await telegramService.sendMessage(
                            user.chat_id,
                            MESSAGE.notifications.reminder(currentIntake, goal),
                            KeyboardUtil.getMainKeyboard()
                        );

                        // Обновляем время последнего уведомления
                        await dbService.updateUser(user.chat_id, {
                            last_notification_time: new Date(),
                        });
                    }
                } catch (error) {
                    logger.error(`Error sending notification to user ${user.chat_id}:`, error);
                }
            });
            this.jobs.set(user.chat_id, job);
        });
    }

    getProgressBar(percentage) {
        const filledCount = Math.floor(percentage / 10);
        const emptyCount = 10 - filledCount;
        return '🟦'.repeat(filledCount) + '⬜️'.repeat(emptyCount);
    }

    updateUserReminder(chatId) {
        const user = this.jobs.get(chatId);
        if (user) {
            user.cancel();
        }

        const times = ['12:00', '15:00', '18:00'];

        times.forEach((time) => {
            const [hours, minutes] = time.split(':').map(Number);

            const job = schedule.scheduleJob({ hour: hours, minute: minutes }, async () => {
                try {
                    const todayStats = await dbService.getTodayStats(chatId);
                    const currentIntake = Math.round(todayStats.total * 1000); // конвертируем в мл
                    const goal = (await dbService.getUser(chatId)).daily_goal * 1000; // конвертируем в мл

                    // Отправляем уведомление только если текущее потребление меньше цели
                    if (currentIntake < goal) {
                        await telegramService.sendMessage(
                            chatId,
                            MESSAGE.notifications.reminder(currentIntake, goal),
                            KeyboardUtil.getMainKeyboard()
                        );

                        // Обновляем время последнего уведомления
                        await dbService.updateUser(chatId, { last_notification_time: new Date() });
                    }
                } catch (error) {
                    logger.error(`Error sending notification to user ${chatId}:`, error);
                }
            });
            this.jobs.set(chatId, job);
        });
    }

    cancelUserReminders(chatId) {
        const job = this.jobs.get(chatId);
        if (job) {
            job.cancel();
            this.jobs.delete(chatId);
        }
    }
}

module.exports = new NotificationService();

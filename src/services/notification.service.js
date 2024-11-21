const schedule = require('node-schedule');
const config = require('../config/config');
const telegramService = require('./telegram.service');
const dbService = require('./database.service');
const KeyboardUtil = require('../utils/keyboard.util');
const MESSAGE = require('../config/message.config');
const logger = require('../config/logger.config');

class NotificationService {
    constructor() {
        this.jobs = new Map();
    }

    async scheduleReminders(chatId = null) {
        try {
            if (chatId) {
                logger.info(`Scheduling reminders for user ${chatId}`);
                const user = await dbService.getUser(chatId);
                if (user) {
                    this.scheduleUserReminder(user);
                }
            } else {
                logger.info('Scheduling reminders for all users');
                this.jobs.forEach((job) => job.cancel());
                this.jobs.clear();

                const users = await dbService.getAllUsers();
                users.forEach((user) => this.scheduleUserReminder(user));
            }
        } catch (error) {
            logger.error('Error scheduling reminders:', error);
            throw error;
        }
    }

    async cancelReminders(chatId) {
        try {
            logger.info(`Cancelling reminders for user ${chatId}`);
            const job = this.jobs.get(chatId);
            if (job) {
                job.cancel();
                this.jobs.delete(chatId);
            }
        } catch (error) {
            logger.error('Error cancelling reminders:', error);
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
            const lastNotification = new Date(user.last_notification * 1000);
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
            logger.info('User data:', user);
            const dailyIntake = await dbService.getDailyWaterIntake(user.chat_id);
            logger.info('Daily intake:', dailyIntake);

            if (!isTest && !(await this.shouldSendNotification(user, dailyIntake))) {
                return;
            }

            const message = MESSAGE.notifications.reminder.format(
                dailyIntake.total,
                user.daily_goal
            );
            logger.info('Sending reminder message:', message);

            await telegramService.sendMessage(user.chat_id, message);
            await dbService.updateUser(user.chat_id, {
                last_notification: Math.floor(Date.now() / 1000),
            });
        } catch (error) {
            logger.error(`Error sending reminder to user ${user.chat_id}:`, error);
            throw error;
        }
    }

    scheduleUserReminder(user) {
        // Отменяем существующие напоминания
        this.cancelReminders(user.chat_id);

        if (!user.notification_enabled) {
            return;
        }

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
                            last_notification: Math.floor(Date.now() / 1000),
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

    async toggleNotifications(chatId, messageId) {
        try {
            const user = await dbService.getUser(chatId);
            const notificationsEnabled = !user.notification_enabled;
            await dbService.updateUser(chatId, { notification_enabled: notificationsEnabled });

            const message = notificationsEnabled
                ? MESSAGE.notifications.enabled
                : MESSAGE.notifications.disabled;
            const keyboard = KeyboardUtil.getMainKeyboard(notificationsEnabled);

            await telegramService.editMessage(chatId, messageId, message, keyboard);

            if (notificationsEnabled) {
                await this.scheduleReminders(chatId);
            } else {
                await this.cancelReminders(chatId);
            }
        } catch (error) {
            logger.error('Error toggling notifications:', error);
            throw error;
        }
    }

    async sendNotification(chatId) {
        try {
            const user = await dbService.getUser(chatId);
            if (!user || !user.notification_enabled) {
                return;
            }

            const todayIntake = await dbService.getTodayIntake(chatId);
            const message = MESSAGE.notifications.reminder.format(todayIntake, user.daily_goal);
            const keyboard = KeyboardUtil.getMainKeyboard(user.notification_enabled);

            await telegramService.sendMessage(chatId, message, keyboard);
            await this.scheduleNotification(chatId);
        } catch (error) {
            logger.error('Error sending notification:', error);
        }
    }
}

module.exports = new NotificationService();

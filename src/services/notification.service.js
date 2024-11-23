const schedule = require('node-schedule');
const config = require('../config/config');
const telegramService = require('./telegram.service');
const dbService = require('./database.service');
const KeyboardUtil = require('../utils/keyboard.util');
const MESSAGE = require('../config/message.config');
const logger = require('../config/logger.config');

class NotificationService {
    constructor(dbService, telegramService, logger) {
        this.dbService = dbService;
        this.telegramService = telegramService;
        this.logger = logger;
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
                this.jobs.forEach((jobs) => jobs.forEach((job) => job.cancel()));
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
            const jobs = this.jobs.get(chatId);
            if (jobs) {
                jobs.forEach((job) => job.cancel());
                this.jobs.delete(chatId);
                logger.info(`Cancelled ${jobs.length} reminders for user ${chatId}`);
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

        if (dailyIntake.total >= user.daily_goal) {
            return false;
        }

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

    async sendWaterReminder(user) {
        const todayStats = await this.dbService.getDailyWaterIntake(user.id);
        const currentIntake = todayStats.total;
        const goal = user.daily_goal;

        if (currentIntake < goal) {
            const messages = MESSAGE.notifications.reminder.messages;
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            const progressMessage = MESSAGE.stats.formatDailyProgress(currentIntake, goal);
            const fullMessage = `${randomMessage}\n${progressMessage}`;

            await this.telegramService.sendMessage(
                user.chat_id,
                fullMessage,
                KeyboardUtil.getMainKeyboard()
            );

            await this.dbService.updateUser(user.chat_id, {
                last_notification: Math.floor(Date.now() / 1000),
            });

            return true;
        } else {
            this.logger.info(`Skipping reminder for user ${user.chat_id} - goal reached`);
            return false;
        }
    }

    async scheduleUserReminder(user) {
        // Отменяем существующие напоминания
        this.cancelReminders(user.chat_id);

        if (!user.notification_enabled) {
            this.logger.info(`Notifications disabled for user ${user.id}`);
            return;
        }

        const times = ['11:00', '14:00', '17:00'];
        const jobs = [];

        times.forEach((time) => {
            const [hours, minutes] = time.split(':').map(Number);
            this.logger.info(`Scheduling reminder for user ${user.id} at ${time}`);

            const job = schedule.scheduleJob({ hour: hours, minute: minutes }, async () => {
                try {
                    await this.sendWaterReminder(user);
                } catch (error) {
                    this.logger.error(`Error sending notification to user ${user.chat_id}:`, error);
                }
            });
            jobs.push(job);
        });

        // Store all jobs for this user
        this.jobs.set(user.chat_id, jobs);
        this.logger.info(`Scheduled ${jobs.length} reminders for user ${user.chat_id}`);
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
}

module.exports = new NotificationService(dbService, telegramService, logger);

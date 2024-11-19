const schedule = require('node-schedule');
const config = require('../config/config');
const telegramService = require('./telegram.service');
const dbService = require('./database.service');
const ValidationUtil = require('../utils/validation.util');
const ReminderUtil = require('../utils/reminder.util');

class NotificationService {
    constructor() {
        this.jobs = new Map();
        this.lastNotifications = new Map(); // время последнего уведомления для каждого пользователя
        this.dailyNotificationCount = new Map(); // количество уведомлений за день
        this.lastDrinkTime = new Map(); // время последнего добавления напитка
    }

    async scheduleReminders() {
        try {
            this.jobs.forEach((job) => job.cancel());
            this.jobs.clear();

            const users = await dbService.getAllUsers();
            users.forEach((user) => {
                if (user.notification_enabled) {
                    this.scheduleUserReminder(user);
                }
            });

            // Сброс счетчиков уведомлений в полночь
            schedule.scheduleJob('0 0 * * *', () => {
                this.dailyNotificationCount.clear();
            });
        } catch (error) {
            console.error('Error scheduling reminders:', error);
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

    shouldSendNotification(user, dailyIntake) {
        const now = Date.now();
        const period = this.getCurrentPeriod();
        if (!period) return false; // не отправляем уведомления ночью

        // Проверяем ограничения
        const lastNotification = this.lastNotifications.get(user.user_id) || 0;
        const lastDrink = this.lastDrinkTime.get(user.user_id) || 0;
        const notificationCount = this.dailyNotificationCount.get(user.user_id) || 0;

        if (now - lastNotification < config.notifications.limits.minInterval) return false;
        if (now - lastDrink < config.notifications.limits.backoffTime) return false;
        if (notificationCount >= config.notifications.limits.maxDaily) return false;

        // Проверяем прогресс в текущем периоде
        const { targetPercent } = config.notifications.periods[period];
        const currentProgress = (dailyIntake.total / user.daily_goal) * 100;
        const expectedProgress = this.getExpectedProgress(period);

        // Отправляем уведомление, если отстаем от графика
        return currentProgress < expectedProgress;
    }

    getExpectedProgress(period) {
        const { periods } = config.notifications;
        let expected = 0;

        // Суммируем целевые проценты для всех предыдущих периодов и текущего
        if (period === 'evening') {
            expected += periods.morning.targetPercent + periods.day.targetPercent;
        } else if (period === 'day') {
            expected += periods.morning.targetPercent;
        }

        // Добавляем часть текущего периода
        const periodConfig = periods[period];
        const periodLength = periodConfig.end - periodConfig.start;
        const currentHour = new Date().getHours();
        const hoursIntoPeriod = currentHour - periodConfig.start;
        const periodProgress = hoursIntoPeriod / periodLength;

        expected += periodConfig.targetPercent * periodProgress;
        return expected;
    }

    scheduleUserReminder(user) {
        const [hours, minutes] = user.notification_time.split(':');
        const rule = new schedule.RecurrenceRule();
        rule.hour = parseInt(hours);
        rule.minute = parseInt(minutes);

        const job = schedule.scheduleJob(rule, () => this.sendReminder(user));
        this.jobs.set(user.user_id, job);
    }

    async sendReminder(user) {
        try {
            if (!user.notification_enabled) return;

            const today = new Date();
            const dailyIntake = await dbService.getDailyWaterIntake(user.user_id, today);

            if (dailyIntake.total >= user.daily_goal) return;

            // Проверяем, нужно ли отправлять уведомление
            if (!this.shouldSendNotification(user, dailyIntake)) return;

            const percentage = ValidationUtil.formatPercentage(dailyIntake.total, user.daily_goal);
            const progressBar = this.getProgressBar(percentage);
            const period = this.getCurrentPeriod();
            const expectedProgress = this.getExpectedProgress(period);

            const reminderMessage = ReminderUtil.getRandomMessage();
            const message =
                `${reminderMessage}\n\n` +
                'Сегодня вы выпили:\n' +
                `💧 Вода: ${dailyIntake.water}л\n` +
                `🥤 Другие напитки: ${dailyIntake.other}л\n` +
                `📊 Всего: ${dailyIntake.total}л из ${user.daily_goal}л\n\n` +
                `Текущий прогресс: ${percentage}%\n` +
                `Ожидаемый прогресс: ${expectedProgress.toFixed(1)}%\n` +
                progressBar;

            await telegramService.sendMessage(user.user_id, message);

            // Обновляем счетчики
            this.lastNotifications.set(user.user_id, Date.now());
            this.dailyNotificationCount.set(
                user.user_id,
                (this.dailyNotificationCount.get(user.user_id) || 0) + 1
            );
        } catch (error) {
            console.error('Error sending reminder:', error);
        }
    }

    getProgressBar(percentage) {
        const filledCount = Math.floor(percentage / 10);
        const emptyCount = 10 - filledCount;
        return '🟦'.repeat(filledCount) + '⬜️'.repeat(emptyCount);
    }

    updateUserReminder(chatId) {
        return dbService
            .getUser(chatId)
            .then((user) => {
                if (user && user.notification_enabled) {
                    const oldJob = this.jobs.get(chatId);
                    if (oldJob) {
                        oldJob.cancel();
                    }
                    this.scheduleUserReminder(user);
                }
            })
            .catch((error) => {
                console.error('Error updating user reminder:', error);
            });
    }

    cancelUserReminders(chatId) {
        const job = this.jobs.get(chatId);
        if (job) {
            job.cancel();
            this.jobs.delete(chatId);
        }
    }

    // Метод для обновления времени последнего питья
    updateLastDrinkTime(userId) {
        this.lastDrinkTime.set(userId, Date.now());
    }
}

module.exports = new NotificationService();

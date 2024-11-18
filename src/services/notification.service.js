const schedule = require('node-schedule');
const config = require('../config/config');
const telegramService = require('./telegram.service');
const dbService = require('./database.service');
const ValidationUtil = require('../utils/validation.util');

class NotificationService {
    constructor() {
        this.jobs = new Map();
    }

    async scheduleReminders() {
        try {
            // Отменяем все текущие задачи
            this.jobs.forEach(job => job.cancel());
            this.jobs.clear();

            const users = await dbService.getAllUsers();
            users.forEach(user => {
                if (!user.do_not_disturb) {
                    this.scheduleUserReminder(user);
                }
            });
        } catch (error) {
            console.error('Error scheduling reminders:', error);
        }
    }

    scheduleUserReminder(user) {
        const [hours, minutes] = user.notification_time.split(':');
        const rule = new schedule.RecurrenceRule();
        rule.hour = parseInt(hours);
        rule.minute = parseInt(minutes);

        const job = schedule.scheduleJob(rule, async () => {
            try {
                if (user.do_not_disturb) {
                    return;
                }

                const today = new Date();
                const dailyIntake = await dbService.getDailyWaterIntake(user.user_id, today);
                const percentage = ValidationUtil.formatPercentage(dailyIntake, user.daily_goal);
                const progressBar = ValidationUtil.createProgressBar(percentage);

                const message = `🚰 Напоминание о воде!\n\n` +
                              `Сегодня вы выпили: ${ValidationUtil.formatWaterAmount(dailyIntake)}\n` +
                              `Ваша цель: ${ValidationUtil.formatWaterAmount(user.daily_goal)}\n` +
                              `Прогресс: ${percentage}%\n${progressBar}`;

                await telegramService.sendMessage(user.user_id, message);
            } catch (error) {
                console.error(`Error sending reminder to user ${user.user_id}:`, error);
            }
        });

        this.jobs.set(user.user_id, job);
    }

    cancelUserReminders(userId) {
        const job = this.jobs.get(userId);
        if (job) {
            job.cancel();
            this.jobs.delete(userId);
        }
    }

    async updateUserReminder(userId) {
        const user = await dbService.getUser(userId);
        if (user) {
            this.cancelUserReminders(userId);
            if (!user.do_not_disturb) {
                this.scheduleUserReminder(user);
            }
        }
    }
}

module.exports = new NotificationService();

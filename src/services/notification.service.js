const schedule = require('node-schedule');
const config = require('../config/config');
const telegramService = require('./telegram.service');
const dbService = require('./database.service');
const ValidationUtil = require('../utils/validation.util');
const ReminderUtil = require('../utils/reminder.util');

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

        const job = schedule.scheduleJob(rule, () => this.sendReminder(user));

        this.jobs.set(user.user_id, job);
    }

    async sendReminder(user) {
        try {
            if (user.do_not_disturb) {
                return;
            }

            const today = new Date();
            const dailyIntake = await dbService.getDailyWaterIntake(user.user_id, today);
            
            // Проверяем, достигнута ли дневная норма
            if (dailyIntake.total >= user.daily_goal) {
                return;
            }

            const percentage = ValidationUtil.formatPercentage(dailyIntake.total, user.daily_goal);
            const progressBar = this.getProgressBar(percentage);

            const reminderMessage = ReminderUtil.getRandomMessage();
            const message = `${reminderMessage}\n\n` +
                          `Сегодня вы выпили:\n` +
                          `💧 Вода: ${dailyIntake.water}л\n` +
                          `🥤 Другие напитки: ${dailyIntake.other}л\n` +
                          `📊 Всего: ${dailyIntake.total}л из ${user.daily_goal}л\n\n` +
                          `Прогресс: ${percentage}%\n${progressBar}`;

            await telegramService.sendMessage(user.user_id, message);
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
        return dbService.getUser(chatId)
            .then(user => {
                if (user && !user.do_not_disturb) {
                    // Отменяем старое напоминание, если оно есть
                    const oldJob = this.jobs.get(chatId);
                    if (oldJob) {
                        oldJob.cancel();
                    }
                    // Устанавливаем новое напоминание
                    this.scheduleUserReminder(user);
                }
            })
            .catch(error => {
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

    async sendDebugNotification(chatId) {
        const user = await dbService.getUser(chatId);
        if (!user) {
            throw new Error('User not found');
        }

        await this.sendReminder(user);
    }
}

module.exports = new NotificationService();

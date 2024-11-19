const ValidationUtil = require('./validation.util');
const config = require('../config/config');

class MessageUtil {
    static formatWaterAddedMessage(amount, dailyIntake, goal) {
        return (
            `🎯 Отлично! Добавлено ${ValidationUtil.formatWaterAmount(amount)}!\n\n` +
            `💧 Вода: ${ValidationUtil.formatWaterAmount(dailyIntake.water)}\n` +
            `🥤 Другие напитки: ${ValidationUtil.formatWaterAmount(dailyIntake.other)}\n` +
            `📊 Всего: ${ValidationUtil.formatWaterAmount(dailyIntake.total)} из ${ValidationUtil.formatWaterAmount(goal)}\n\n` +
            `${dailyIntake.total >= goal ? '🎉 Ты достиг(ла) дневной цели! Так держать! 💪' : '💪 Продолжай в том же духе!'}`
        );
    }

    static formatDailyStats(stats, goal, options = { showEmoji: true }) {
        const percentage = ValidationUtil.formatPercentage(stats.total, goal);
        let message = '';
        message += `💧 Вода: ${ValidationUtil.formatWaterAmount(stats.water)}\n`;
        message += `🥤 Другие напитки: ${ValidationUtil.formatWaterAmount(stats.other)}\n`;
        message += `📊 Всего: ${ValidationUtil.formatWaterAmount(stats.total)} из ${ValidationUtil.formatWaterAmount(goal)}\n`;
        if (options.showEmoji) {
            message += `✨ Прогресс: ${percentage}%\n`;
        } else {
            message += `Прогресс: ${percentage}%\n`;
        }
        message += this.getProgressBar(percentage);
        return message;
    }

    static formatAllTimeStats(stats) {
        return (
            `📅 Дней ведения статистики: ${stats.days}\n` +
            `💧 Общий объем: ${ValidationUtil.formatWaterAmount(stats.total)}\n` +
            `📈 Среднее в день: ${stats.average.toFixed(2)}\n` +
            `🏆 Максимум за день: ${ValidationUtil.formatWaterAmount(stats.max)} (${stats.maxDate})\n`
        );
    }

    static formatPeriodStats(stats) {
        let message = '';
        stats.forEach((day) => {
            const date = new Date(day.date);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
            });
            message += `${formattedDate}:\n`;
            message += `💧 Вода: ${ValidationUtil.formatWaterAmount(day.water)}\n`;
            message += `🥤 Другие: ${ValidationUtil.formatWaterAmount(day.other)}\n`;
            message += `📊 Всего: ${ValidationUtil.formatWaterAmount(day.total)}\n\n`;
        });
        return message;
    }

    static getProgressBar(percentage) {
        const filledCount = Math.floor(percentage / 10);
        const emptyCount = 10 - filledCount;
        return '🟦'.repeat(filledCount) + '⬜️'.repeat(emptyCount);
    }

    static formatGoalSetMessage(goal) {
        const { morning, day, evening } = config.notifications.periods;

        return (
            '🎉 Отлично! Цель установлена!\n\n' +
            '🤖 Я буду отправлять тебе умные напоминания в течение дня:\n' +
            `🌅 Утром (${morning.targetPercent}% от цели)\n` +
            `☀️ Днём (${day.targetPercent}% от цели)\n` +
            `🌆 Вечером (${evening.targetPercent}% от цели)\n\n` +
            '💪 Давай начнем следить за твоим водным балансом! 💧'
        );
    }

    static formatStatsMessage(title, stats, period, dailyGoal) {
        let message = `📊 ${title}\n\n`;

        if (period === 'today') {
            message += this.formatDailyStats(stats, dailyGoal);
        } else if (period === 'all') {
            message += this.formatAllTimeStats(stats);
        } else {
            message += this.formatPeriodStats(stats);
        }

        return message;
    }
}

module.exports = MessageUtil;

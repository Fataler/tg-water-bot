const ValidationUtil = require('./validation.util');
const config = require('../config/config');
const KEYBOARD = require('../config/keyboard.config');
const MESSAGE = require('../config/message.config');

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

    static formatDailyStats(amount, goal, options = { showEmoji: true }) {
        const percent = Math.round((amount / goal) * 100);
        const emoji = options.showEmoji ? '💧 ' : '';
        return `${emoji}Сегодня: ${amount}л из ${goal}л (${percent}%)`;
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
        if (!Array.isArray(stats)) {
            return 'Нет данных за выбранный период';
        }

        if (stats.length === 0) {
            return 'Нет данных за выбранный период';
        }

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
        return message || 'Нет данных за выбранный период';
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

    static formatStatsMessage(title, stats, period, goal) {
        let message = `📊 ${title}:\n\n`;

        if (period === KEYBOARD.periods.today.id) {
            message += this.formatDailyStats(stats, goal);
        } else {
            message += `Всего выпито: ${stats.total}л\n`;
            message += `В среднем: ${stats.average}л в день\n`;
            if (stats.maxDay) {
                message += `\nЛучший день: ${stats.maxDay.date} (${stats.maxDay.amount}л)\n`;
            }
        }

        return message;
    }
}

module.exports = MessageUtil;

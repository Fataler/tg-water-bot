const telegramService = require('../services/telegram.service');

class KeyboardUtil {
    static getMainKeyboard() {
        return {
            reply_markup: {
                keyboard: [['💧 Добавить воду'], ['📊 Статистика', '⚙️ Настройки']],
                resize_keyboard: true,
            },
        };
    }

    static getDrinkTypeKeyboard(message_id) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💧 Вода', callback_data: `drink_water_${message_id}` },
                        { text: '🥤 Другой напиток', callback_data: `drink_other_${message_id}` },
                    ],
                ],
            },
        };
    }

    static getSettingsKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎯 Изменить цель', callback_data: 'change_goal' }],
                    [{ text: '❌ Сбросить прогресс', callback_data: 'reset_progress' }],
                ],
            },
        };
    }

    static getCustomAmountKeyboard(type, message_id) {
        const amounts = [
            [
                { text: '0.1', amount: 0.1 },
                { text: '0.2', amount: 0.2 },
                { text: '0.3', amount: 0.3 },
            ],
            [
                { text: '0.4', amount: 0.4 },
                { text: '0.5', amount: 0.5 },
                { text: '0.75', amount: 0.75 },
            ],
            [
                { text: '1', amount: 1 },
                { text: '1.5', amount: 1.5 },
                { text: '2', amount: 2 },
            ],
        ];

        return {
            reply_markup: {
                inline_keyboard: amounts.map((row) =>
                    row.map((item) => ({
                        text: item.text,
                        callback_data: `${type}_${item.amount}_${message_id}`,
                    }))
                ),
            },
        };
    }

    static getWaterAmountKeyboard(message_id) {
        return this.getCustomAmountKeyboard('water', message_id);
    }

    static getOtherAmountKeyboard(message_id) {
        return this.getCustomAmountKeyboard('other', message_id);
    }

    static getStatsKeyboard(message_id) {
        const periods = [
            [
                { text: 'День', period: 'day' },
                { text: 'Неделя', period: 'week' },
            ],
            [
                { text: 'Месяц', period: 'month' },
                { text: 'Год', period: 'year' },
            ],
        ];

        return {
            reply_markup: {
                inline_keyboard: periods.map((row) =>
                    row.map((item) => ({
                        text: item.text,
                        callback_data: `stats_${item.period}_${message_id}`,
                    }))
                ),
            },
        };
    }

    static getGoalKeyboard() {
        const goals = [
            [
                { text: '1.5', goal: 1.5 },
                { text: '2', goal: 2 },
                { text: '2.5', goal: 2.5 },
            ],
            [
                { text: '3', goal: 3 },
                { text: '3.5', goal: 3.5 },
                { text: '4', goal: 4 },
            ],
        ];

        return {
            reply_markup: {
                inline_keyboard: goals.map((row) =>
                    row.map((item) => ({
                        text: item.text,
                        callback_data: `goal_${item.goal}`,
                    }))
                ),
            },
        };
    }
}

module.exports = KeyboardUtil;

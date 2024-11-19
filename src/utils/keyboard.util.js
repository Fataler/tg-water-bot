const config = require('../config/config');

class KeyboardUtil {
    static getMainKeyboard() {
        return {
            reply_markup: {
                keyboard: [
                    ['💧 Добавить воду'],
                    ['📊 Статистика', '⚙️ Настройки']
                ],
                resize_keyboard: true
            }
        };
    }

    static getDrinkTypeKeyboard(message_id) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '💧 Вода', callback_data: `drink_water_${message_id}` },
                        { text: '🥤 Другой напиток', callback_data: `drink_other_${message_id}` }
                    ]
                ]
            }
        };
    }

    static getAmountKeyboard(type, message_id) {
        const amounts = [
            [
                { amount: '0.2', text: '0.2л' },
                { amount: '0.3', text: '0.3л' },
                { amount: '0.5', text: '0.5л' }
            ],
            [
                { amount: '0.7', text: '0.7л' },
                { amount: '1.0', text: '1.0л' },
                { amount: 'custom', text: 'Другое' }
            ]
        ];

        return {
            reply_markup: {
                inline_keyboard: amounts.map(row => 
                    row.map(item => ({
                        text: item.text,
                        callback_data: `${type}_${item.amount}_${message_id}`
                    }))
                )
            }
        };
    }

    static getWaterAmountKeyboard(message_id) {
        return this.getAmountKeyboard('water', message_id);
    }

    static getOtherDrinkAmountKeyboard(message_id) {
        return this.getAmountKeyboard('other', message_id);
    }

    static getStatsKeyboard(message_id) {
        const periods = [
            [
                { period: 'today', text: 'Сегодня' },
                { period: 'week', text: 'Неделя' }
            ],
            [
                { period: 'month', text: 'Месяц' },
                { period: 'all', text: 'Всё время' }
            ]
        ];

        return {
            reply_markup: {
                inline_keyboard: periods.map(row =>
                    row.map(item => ({
                        text: item.text,
                        callback_data: `stats_${item.period}_${message_id}`
                    }))
                )
            }
        };
    }

    static getGoalKeyboard() {
        const goals = [
            [
                { goal: '1.5', text: '1.5л' },
                { goal: '2', text: '2л' },
                { goal: '2.5', text: '2.5л' }
            ],
            [
                { goal: '3', text: '3л' },
                { goal: 'custom', text: 'Другое значение' }
            ]
        ];

        return {
            reply_markup: {
                inline_keyboard: goals.map(row =>
                    row.map(item => ({
                        text: item.text,
                        callback_data: `goal_${item.goal}`
                    }))
                )
            }
        };
    }

    static getSettingsKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🎯 Изменить цель', callback_data: 'settings_goal' },
                    ],
                    [
                        { text: '🔔 Вкл. уведомления', callback_data: 'settings_notifications_true' },
                        { text: '🔕 Выкл. уведомления', callback_data: 'settings_notifications_false' }
                    ]
                ]
            }
        };
    }

    static createTimeKeyboard() {
        // Оставляем этот метод пустым на случай, если он где-то используется
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '⚠️ Эта функция больше не поддерживается', callback_data: 'time_deprecated' }]
                ]
            }
        };
    }
}

module.exports = KeyboardUtil;

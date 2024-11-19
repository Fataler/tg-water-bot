const telegramService = require('../services/telegram.service');
const KEYBOARD = require('../config/keyboard.config');

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
                        {
                            text: KEYBOARD.drinks.water.text,
                            callback_data: `drink_${KEYBOARD.drinks.water.id}_${message_id}`,
                        },
                        {
                            text: KEYBOARD.drinks.other.text,
                            callback_data: `drink_${KEYBOARD.drinks.other.id}_${message_id}`,
                        },
                    ],
                ],
            },
        };
    }

    static getSettingsKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: KEYBOARD.settings.goal.text,
                            callback_data: `settings_${KEYBOARD.settings.goal.id}`,
                        },
                    ],
                    [
                        {
                            text: KEYBOARD.settings.reset.text,
                            callback_data: KEYBOARD.settings.reset.id,
                        },
                    ],
                ],
            },
        };
    }

    static getCustomAmountKeyboard(type, message_id) {
        // Преобразуем объект amounts из конфига в массив, исключая custom
        const amountEntries = Object.entries(KEYBOARD.amounts)
            .filter(([key]) => key !== 'custom')
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

        // Разбиваем на ряды по 3 кнопки
        const amounts = [];
        for (let i = 0; i < amountEntries.length; i += 3) {
            amounts.push(amountEntries.slice(i, i + 3));
        }

        return {
            reply_markup: {
                inline_keyboard: [
                    ...amounts.map((row) =>
                        row.map(([amount, config]) => ({
                            text: config.text,
                            callback_data: `${type}_${amount}_${message_id}`,
                        }))
                    ),
                    [
                        {
                            text: KEYBOARD.amounts.custom.text,
                            callback_data: `${type}_custom_${message_id}`,
                        },
                    ],
                ],
            },
        };
    }

    static getWaterAmountKeyboard(message_id) {
        return this.getCustomAmountKeyboard(KEYBOARD.drinks.water.id, message_id);
    }

    static getOtherAmountKeyboard(message_id) {
        return this.getCustomAmountKeyboard(KEYBOARD.drinks.other.id, message_id);
    }

    static getStatsKeyboard(message_id) {
        const periods = [
            [
                {
                    text: KEYBOARD.periods.today.text,
                    period: KEYBOARD.periods.today.id,
                },
                {
                    text: KEYBOARD.periods.week.text,
                    period: KEYBOARD.periods.week.id,
                },
            ],
            [
                {
                    text: KEYBOARD.periods.month.text,
                    period: KEYBOARD.periods.month.id,
                },
                {
                    text: KEYBOARD.periods.all.text,
                    period: KEYBOARD.periods.all.id,
                },
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

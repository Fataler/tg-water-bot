const KEYBOARD = require('../config/keyboard.config');

class KeyboardUtil {
    static getMainKeyboard() {
        return {
            reply_markup: {
                keyboard: [
                    [KEYBOARD.main.addWater.text],
                    [KEYBOARD.main.stats.text, KEYBOARD.main.settings.text],
                ],
                resize_keyboard: true,
            },
        };
    }

    static getDrinkTypeKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: KEYBOARD.drinks.water.text,
                            callback_data: `drink_${KEYBOARD.drinks.water.id}`,
                        },
                        {
                            text: KEYBOARD.drinks.other.text,
                            callback_data: `drink_${KEYBOARD.drinks.other.id}`,
                        },
                    ],
                ],
            },
        };
    }

    static getSettingsKeyboard(user) {
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
                            text: user?.notification_enabled
                                ? '🔕 Отключить уведомления'
                                : '🔔 Включить уведомления',
                            callback_data: `settings_${KEYBOARD.settings.notifications.id}`,
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

    static getCustomAmountKeyboard(type) {
        const amountEntries = Object.entries(KEYBOARD.amounts)
            .filter(([key]) => key !== 'custom')
            .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

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
                            callback_data: `${type}_${amount}`,
                        }))
                    ),
                    [
                        {
                            text: KEYBOARD.amounts.custom.text,
                            callback_data: `${type}_custom`,
                        },
                    ],
                ],
            },
        };
    }

    static getWaterAmountKeyboard() {
        return this.getCustomAmountKeyboard(KEYBOARD.drinks.water.id);
    }

    static getOtherAmountKeyboard() {
        return this.getCustomAmountKeyboard(KEYBOARD.drinks.other.id);
    }

    static getStatsKeyboard() {
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
                        callback_data: `stats_${item.period}`,
                    }))
                ),
            },
        };
    }

    static getGoalKeyboard() {
        const goalEntries = Object.entries(KEYBOARD.goals).sort((a, b) => a[1].value - b[1].value);

        const goals = [];
        for (let i = 0; i < goalEntries.length; i += 3) {
            goals.push(goalEntries.slice(i, i + 3));
        }

        return {
            reply_markup: {
                inline_keyboard: goals.map((row) =>
                    row.map((entry) => ({
                        text: entry[1].text,
                        callback_data: `goal_${entry[1].value}`,
                    }))
                ),
            },
        };
    }

    static getResetConfirmKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: KEYBOARD.reset.confirm.text,
                            callback_data: 'resetConfirm_confirm',
                        },
                        { text: KEYBOARD.reset.cancel.text, callback_data: 'resetConfirm_cancel' },
                    ],
                ],
            },
        };
    }

    static getCancelKeyboard() {
        return {
            reply_markup: {
                keyboard: [
                    [KEYBOARD.main.cancel.text],
                ],
                resize_keyboard: true,
            },
        };
    }

    static getEmptyKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: []
            }
        };
    }
}

module.exports = KeyboardUtil;

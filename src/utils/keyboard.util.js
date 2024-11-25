const KEYBOARD = require('../config/keyboard.config');

class KeyboardUtil {
    static getMainKeyboard() {
        return {
            reply_markup: {
                keyboard: [
                    [{ text: KEYBOARD.main.addWater.text }],
                    [{ text: KEYBOARD.main.stats.text }, { text: KEYBOARD.main.settings.text }],
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

    static getStatsKeyboard(currentPeriod = null) {
        const periods = [
            [
                {
                    text: KEYBOARD.periods.today.text,
                    callback_data: `stats_${KEYBOARD.periods.today.id}`,
                    hide: currentPeriod === KEYBOARD.periods.today.id,
                },
                {
                    text: KEYBOARD.periods.week.text,
                    callback_data: `stats_${KEYBOARD.periods.week.id}`,
                    hide: currentPeriod === KEYBOARD.periods.week.id,
                },
            ],
            [
                {
                    text: KEYBOARD.periods.month.text,
                    callback_data: `stats_${KEYBOARD.periods.month.id}`,
                    hide: currentPeriod === KEYBOARD.periods.month.id,
                },
                {
                    text: KEYBOARD.periods.all.text,
                    callback_data: `stats_${KEYBOARD.periods.all.id}`,
                    hide: currentPeriod === KEYBOARD.periods.all.id,
                },
            ],
        ];

        return {
            reply_markup: {
                inline_keyboard: periods
                    .map((row) =>
                        row
                            .filter((button) => !button.hide)
                            .map(({ text, callback_data }) => ({ text, callback_data }))
                    )
                    .filter((row) => row.length > 0),
            },
        };
    }

    static getAdminStatsKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: KEYBOARD.adminStats.today.text,
                            callback_data: `adminStats_${KEYBOARD.adminStats.today.id}`,
                        },
                    ],
                    [
                        {
                            text: KEYBOARD.adminStats.week.text,
                            callback_data: `adminStats_${KEYBOARD.adminStats.week.id}`,
                        },
                    ],
                    [
                        {
                            text: KEYBOARD.adminStats.month.text,
                            callback_data: `adminStats_${KEYBOARD.adminStats.month.id}`,
                        },
                    ],
                ],
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
                keyboard: [[KEYBOARD.main.cancel.text]],
                resize_keyboard: true,
            },
        };
    }

    static getEmptyKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [],
            },
        };
    }
}

module.exports = KeyboardUtil;

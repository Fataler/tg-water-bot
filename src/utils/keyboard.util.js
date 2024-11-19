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

    static getSettingsKeyboard(user, message_id) {
        const settings = [
            [
                { setting: 'goal', text: '🎯 Изменить цель' },
                { setting: 'time', text: '⏰ Изменить время' }
            ],
            [
                {
                    setting: 'notifications',
                    text: user.do_not_disturb ? '🔔 Включить уведомления' : '🔕 Отключить уведомления',
                    value: !user.do_not_disturb
                }
            ]
        ];

        return {
            reply_markup: {
                inline_keyboard: settings.map(row =>
                    row.map(item => ({
                        text: item.text,
                        callback_data: `settings_${item.setting}${item.value !== undefined ? '_' + item.value : ''}_${message_id}`
                    }))
                )
            }
        };
    }

    static createTimeKeyboard() {
        const keyboard = [];
        let row = [];
        
        for(let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0');
            row.push({
                text: `${hour}:00`,
                callback_data: `time_${hour}:00`
            });
            
            if(row.length === 3 || i === 23) {
                keyboard.push([...row]);
                row = [];
            }
        }
        
        return {
            reply_markup: {
                inline_keyboard: keyboard
            }
        };
    }
}

module.exports = KeyboardUtil;

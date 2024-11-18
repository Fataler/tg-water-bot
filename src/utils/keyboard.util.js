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

    static getWaterAmountKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '0.25л', callback_data: 'water_0.25' },
                        { text: '0.5л', callback_data: 'water_0.5' },
                        { text: '0.75л', callback_data: 'water_0.75' }
                    ],
                    [
                        { text: '1л', callback_data: 'water_1' },
                        { text: '1.5л', callback_data: 'water_1.5' },
                        { text: '2л', callback_data: 'water_2' }
                    ],
                    [
                        { text: 'Другое количество', callback_data: 'water_custom' }
                    ]
                ]
            }
        };
    }

    static getGoalKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '1.5л', callback_data: 'goal_1.5' },
                        { text: '2л', callback_data: 'goal_2' },
                        { text: '2.5л', callback_data: 'goal_2.5' }
                    ],
                    [
                        { text: '3л', callback_data: 'goal_3' },
                        { text: 'Другое значение', callback_data: 'goal_custom' }
                    ]
                ]
            }
        };
    }

    static getStatsKeyboard() {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'За сегодня', callback_data: 'stats_today' },
                        { text: 'За неделю', callback_data: 'stats_week' }
                    ],
                    [
                        { text: 'За месяц', callback_data: 'stats_month' },
                        { text: 'За все время', callback_data: 'stats_all' }
                    ]
                ]
            }
        };
    }

    static createSettingsKeyboard(user) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Изменить цель', callback_data: 'settings_goal' }],
                    [{ text: 'Изменить время напоминаний', callback_data: 'settings_time' }],
                    [{ 
                        text: user.do_not_disturb ? 'Включить уведомления' : 'Отключить уведомления',
                        callback_data: `settings_notifications_${!user.do_not_disturb}`
                    }]
                ]
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

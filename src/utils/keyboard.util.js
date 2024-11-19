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

    static getWaterAmountKeyboard(message_id) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '0.2л', callback_data: `water_0.2_${message_id}` },
                        { text: '0.3л', callback_data: `water_0.3_${message_id}` },
                        { text: '0.5л', callback_data: `water_0.5_${message_id}` }
                    ],
                    [
                        { text: '0.7л', callback_data: `water_0.7_${message_id}` },
                        { text: '1.0л', callback_data: `water_1.0_${message_id}` },
                        { text: 'Другое', callback_data: `water_custom_${message_id}` }
                    ]
                ]
            }
        };
    }

    static getOtherDrinkAmountKeyboard(message_id) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '0.2л', callback_data: `other_0.2_${message_id}` },
                        { text: '0.3л', callback_data: `other_0.3_${message_id}` },
                        { text: '0.5л', callback_data: `other_0.5_${message_id}` }
                    ],
                    [
                        { text: '0.7л', callback_data: `other_0.7_${message_id}` },
                        { text: '1.0л', callback_data: `other_1.0_${message_id}` },
                        { text: 'Другое', callback_data: `other_custom_${message_id}` }
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

    static getStatsKeyboard(message_id) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Сегодня', callback_data: `stats_today_${message_id}` },
                        { text: 'Неделя', callback_data: `stats_week_${message_id}` }
                    ],
                    [
                        { text: 'Месяц', callback_data: `stats_month_${message_id}` },
                        { text: 'Всё время', callback_data: `stats_all_${message_id}` }
                    ]
                ]
            }
        };
    }

    static getSettingsKeyboard(user, message_id) {
        return {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🎯 Изменить цель', callback_data: `settings_goal_${message_id}` },
                        { text: '⏰ Изменить время', callback_data: `settings_time_${message_id}` }
                    ],
                    [
                        {
                            text: user.do_not_disturb ? '🔔 Включить уведомления' : '🔕 Отключить уведомления',
                            callback_data: `settings_notifications_${!user.do_not_disturb}_${message_id}`
                        }
                    ]
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

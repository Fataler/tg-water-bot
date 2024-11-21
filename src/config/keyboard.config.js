const KEYBOARD = {
    main: {
        addWater: {
            text: '💧 Добавить воду'
        },
        stats: {
            text: '📊 Статистика'
        },
        settings: {
            text: '⚙️ Настройки'
        }
    },
    periods: {
        today: {
            id: 'today',
            text: '📅 Сегодня',
        },
        week: {
            id: 'week',
            text: '📆 Неделя',
        },
        month: {
            id: 'month',
            text: '📊 Месяц',
        },
        all: {
            id: 'all',
            text: '📈 Все время',
        },
    },
    drinks: {
        water: {
            id: 'water',
            text: '💧 Вода',
        },
        other: {
            id: 'other',
            text: '🥤 Другое',
        },
    },
    amounts: {
        0.25: {
            id: '0.25',
            text: '💧 0.25л',
        },
        0.3: {
            id: '0.3',
            text: '💧 0.3л',
        },
        0.5: {
            id: '0.5',
            text: '💧 0.5л',
        },
        custom: {
            id: 'custom',
            text: '✨ Другое количество',
        },
    },
    settings: {
        goal: {
            id: 'goal',
            text: '🎯 Изменить цель',
        },
        notifications: {
            id: 'notifications',
            text: '🔔 Уведомления',
        },
        stats: {
            id: 'stats',
            text: '📊 Статистика',
        },
        reset: {
            id: 'reset',
            text: '🔄 Сброс',
        },
    },
    goals: {
        1.5: {
            text: '1.5',
            value: 1.5
        },
        2: {
            text: '2',
            value: 2
        },
        2.5: {
            text: '2.5',
            value: 2.5
        },
        3: {
            text: '3',
            value: 3
        },
        3.5: {
            text: '3.5',
            value: 3.5
        },
        4: {
            text: '4',
            value: 4
        }
    },
    reset: {
        confirm: {
            id: 'confirm',
            text: '✅ Да, сбросить',
        },
        cancel: {
            id: 'cancel',
            text: '❌ Отмена',
        },
    },
    back: {
        id: 'back',
        text: '⬅️ Назад',
    },
    menu: {
        id: 'menu',
        text: '📱 Меню',
    },
};

module.exports = KEYBOARD;

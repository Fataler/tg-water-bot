require('dotenv').config();

module.exports = {
    telegram: {
        token: process.env.BOT_TOKEN,
        options: { polling: true },
    },
    database: {
        path:
            process.env.IS_DOCKER === 'true'
                ? process.env.DOCKER_DB_PATH || '/data/water_bot.db' // Абсолютный путь для Docker
                : process.env.DB_PATH || 'data/water_bot.db', // Относительный путь для локальной разработки
    },
    server: {
        port: process.env.PORT || 3000,
        url: process.env.APP_URL,
    },
    notifications: {
        retryAttempts: 3,
        retryDelay: 1000,
        timezone: 'Europe/Moscow',
        periods: {
            morning: {
                time: '12:00',
                start: 8,
                end: 12,
                targetPercent: 30,
            },
            day: {
                time: '16:00',
                start: 12,
                end: 17,
                targetPercent: 45,
            },
            evening: {
                time: '19:00',
                start: 17,
                end: 22,
                targetPercent: 25,
            },
        },
        limits: {
            minInterval: 2 * 60 * 60 * 1000, // 2 часа в миллисекундах
            maxDaily: 5, // максимум 5 напоминаний в день
            backoffTime: 30 * 60 * 1000, // 30 минут после добавления записи
        },
    },
    validation: {
        water: {
            minAmount: 0.05,
            maxAmount: 3,
        },
        goal: {
            minAmount: 0.5,
            maxAmount: 5,
            defaultValue: 2,
        },
        timeFormat: 'HH:mm',
    },
    adminIds: [302860056],
};

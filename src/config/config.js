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
        defaultTime: '12:00',
        periods: {
            morning: {
                time: '11:00',
                targetPercent: 30,
            },
            day: {
                time: '14:00',
                targetPercent: 50,
            },
            evening: {
                time: '17:00',
                targetPercent: 20,
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

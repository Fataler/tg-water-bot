require('dotenv').config();

module.exports = {
    telegram: {
        token: process.env.BOT_TOKEN,
        options: { polling: true }
    },
    database: {
        path: process.env.DB_PATH || 'data/water_bot.db'
    },
    server: {
        port: process.env.PORT || 3000,
        url: process.env.APP_URL
    },
    notifications: {
        retryAttempts: 3,
        retryDelay: 1000,
        defaultTime: '12:00'
    },
    validation: {
        water: {
            minAmount: 0.05,
            maxAmount: 3,
            defaultGoal: 2
        },
        timeFormat: 'HH:mm'
    },
    adminIds: [302860056]
};

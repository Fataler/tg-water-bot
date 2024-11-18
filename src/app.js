const telegramService = require('./services/telegram.service');
const dbService = require('./services/database.service');
const notificationService = require('./services/notification.service');
const commandHandler = require('./handlers/command.handler');
const callbackHandler = require('./handlers/callback.handler');
const messageHandler = require('./handlers/message.handler');

class App {
    async start() {
        try {
            // Инициализация базы данных
            await dbService.init();

            // Настройка обработчиков
            commandHandler.setupHandlers();
            callbackHandler.setupHandler();
            messageHandler.setupHandler();

            // Запуск планировщика напоминаний
            await notificationService.scheduleReminders();

            console.log('Бот успешно запущен!');
        } catch (error) {
            console.error('Ошибка при запуске бота:', error);
            process.exit(1);
        }
    }
}

const app = new App();
app.start();

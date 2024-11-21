const dbService = require('./services/database.service');
const notificationService = require('./services/notification.service');
const commandHandler = require('./handlers/command.handler');
const callbackHandler = require('./handlers/callback.handler');
const messageHandler = require('./handlers/message.handler');
const logger = require('./config/logger.config');

class App {
    async start() {
        try {
            logger.info('Starting Water Reminder Bot...');

            // Логируем режим запуска и состояние базы данных
            logger.info(`Running in ${dbService.getMode()} mode`);
            logger.info(`Database path: ${dbService.getDbPath()}`);
            logger.info(
                `Database ${dbService.exists() ? 'found' : 'not found'} at path: ${dbService.getDbPath()}`
            );

            logger.info('Initializing database...');
            await dbService.init();
            logger.info('Database initialized successfully');

            logger.info('Setting up handlers...');
            commandHandler.setupHandlers();
            callbackHandler.setupHandler();
            messageHandler.setupHandler();
            logger.info('Handlers set up successfully');

            logger.info('Scheduling reminders...');
            await notificationService.scheduleReminders();
            logger.info('Reminders scheduled successfully');

            logger.info('Water Reminder Bot started successfully');
        } catch (error) {
            logger.error('Failed to start the application:', error);
            process.exit(1);
        }
    }
}

const app = new App();
app.start();

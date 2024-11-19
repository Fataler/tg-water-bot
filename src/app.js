const telegramService = require('./services/telegram.service');
const dbService = require('./services/database.service');
const notificationService = require('./services/notification.service');
const commandHandler = require('./handlers/command.handler');
const callbackHandler = require('./handlers/callback.handler');
const messageHandler = require('./handlers/message.handler');
const logger = require('./config/logger.config');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');

class App {
    async start() {
        try {
            logger.info('Starting Water Reminder Bot...');
            
            // Логируем режим запуска
            const isDocker = process.env.IS_DOCKER === 'true';
            logger.info(`Running in ${isDocker ? 'Docker' : 'Local'} mode`);
            logger.info(`Database path: ${config.database.path}`);
            
            // Проверяем существование базы данных
            const dbExists = fs.existsSync(path.resolve(config.database.path));
            logger.info(`Database ${dbExists ? 'found' : 'not found'} at path: ${config.database.path}`);
            
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

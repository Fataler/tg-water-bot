const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const config = require('../config/config');
const logger = require('../config/logger.config');
const MESSAGE = require('../config/message.config');
const callbackHandler = require('./callback.handler');

class CommandHandler {
    async handleStart(msg) {
        const chatId = msg.chat.id;
        const user = await dbService.getUser(chatId);

        if (!user) {
            await telegramService.sendMessage(
                chatId,
                MESSAGE.commands.start.welcome,
                KeyboardUtil.getGoalKeyboard()
            );
        } else {
            try {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.commands.start.welcome_back,
                    KeyboardUtil.getMainKeyboard()
                );
            } catch (error) {
                if (
                    error.response?.body?.error_code === 403 ||
                    error.response?.body?.error_code === 400
                ) {
                    await dbService.deleteUser(chatId);
                    logger.info(
                        `Пользователь ${chatId} удален из базы данных (бот заблокирован или удален)`
                    );
                }
            }
        }
    }

    async handleReset(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(
            chatId,
            MESSAGE.prompts.reset.confirm,
            KeyboardUtil.getResetConfirmKeyboard()
        );
    }

    async handleAddWater(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(
            chatId,
            MESSAGE.commands.addWater,
            KeyboardUtil.getDrinkTypeKeyboard()
        );
    }

    async handleStats(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(
            chatId,
            MESSAGE.commands.stats,
            KeyboardUtil.getStatsKeyboard()
        );
    }

    async handleSettings(msg) {
        const chatId = msg.chat.id;

        const user = await dbService.getUser(chatId);
        if (user) {
            try {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.commands.settings,
                    KeyboardUtil.getSettingsKeyboard(user)
                );
            } catch (error) {
                logger.error('Error handling settings:', error);
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.general,
                    KeyboardUtil.getMainKeyboard()
                );
            }
        } else {
            await telegramService.sendMessage(chatId, MESSAGE.errors.userNotFound);
        }
    }

    async handleHelp(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(chatId, MESSAGE.commands.help, {
            parse_mode: 'Markdown',
        });
    }

    async handleDebug(msg) {
        try {
            const userId = msg.from.id;
            const chatId = msg.chat.id;

            if (!config.adminIds.includes(userId)) {
                await telegramService.sendMessage(chatId, MESSAGE.errors.noAccess);
                return;
            }

            const user = await dbService.getUser(chatId);

            if (!user) {
                await telegramService.sendMessage(chatId, MESSAGE.errors.userNotFound);
                return;
            }

            const sent = await notificationService.sendWaterReminder(user);

            var debugMessageSentText = sent
                ? MESSAGE.commands.debug.testNotificationSent
                : MESSAGE.commands.debug.testNotificationNotSent;

            await telegramService.sendMessage(chatId, debugMessageSentText);
        } catch (error) {
            logger.error('Error in debug command:', error);
            await telegramService.sendMessage(msg.chat.id, MESSAGE.errors.general);
        }
    }

    setupHandlers() {
        const bot = telegramService.getBot();
        bot.onText(/\/start/, (msg) => this.handleStart(msg));
        bot.onText(/\/reset/, (msg) => this.handleReset(msg));
        bot.onText(/💧 Добавить воду/, (msg) => this.handleAddWater(msg));
        bot.onText(/📊 Статистика/, (msg) => this.handleStats(msg));
        bot.onText(/⚙️ Настройки/, (msg) => this.handleSettings(msg));
        bot.onText(/\/help/, (msg) => this.handleHelp(msg));
        bot.onText(/\/debug/, (msg) => this.handleDebug(msg));
    }
}

module.exports = new CommandHandler();

const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const config = require('../config/config');
const logger = require('../config/logger.config');
const MESSAGE = require('../config/message.config');

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
        const confirmKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Да, сбросить', callback_data: 'reset_confirm' },
                        { text: '❌ Нет, отменить', callback_data: 'reset_cancel' },
                    ],
                ],
            },
        };
        await telegramService.sendMessage(chatId, MESSAGE.prompts.reset.confirm, confirmKeyboard);
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
                // First send the message with initial keyboard
                const message = await telegramService.sendMessage(
                    chatId,
                    MESSAGE.commands.settings,
                    KeyboardUtil.getSettingsKeyboard(user, null)
                );

                // Then update it with the message ID in the keyboard
                await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    MESSAGE.commands.settings,
                    KeyboardUtil.getSettingsKeyboard(user, message.message_id)
                );
            } catch (error) {
                logger.error('Error handling settings:', error);
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.general,
                    KeyboardUtil.getMainKeyboard()
                );
            }
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

            await notificationService.sendReminder(user, true);
            await telegramService.sendMessage(chatId, MESSAGE.commands.debug.testNotificationSent);
        } catch (error) {
            logger.error('Error in debug command:', error);
            await telegramService.sendMessage(msg.chat.id, MESSAGE.errors.general);
        }
    }

    setupHandlers() {
        telegramService.onText(/\/start/, this.handleStart);
        telegramService.onText(/\/reset/, this.handleReset);
        telegramService.onText(/💧 Добавить воду/, this.handleAddWater);
        telegramService.onText(/📊 Статистика/, this.handleStats);
        telegramService.onText(/⚙️ Настройки/, this.handleSettings);
        telegramService.onText(/\/help/, this.handleHelp);
        telegramService.onText(/\/debug/, this.handleDebug);
    }
}

module.exports = new CommandHandler();

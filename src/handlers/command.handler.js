const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const config = require('../config/config');
const logger = require('../config/logger.config');
const MESSAGE = require('../config/message.config');
const KEYBOARD = require('../config/keyboard.config');

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
                // Update user info
                await dbService.updateUserInfo(chatId, {
                    username: msg.from.username,
                    first_name: msg.from.first_name,
                    last_name: msg.from.last_name,
                });
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

        try {
            const user = await dbService.getUser(chatId);
            if (!user) {
                await telegramService.sendMessage(chatId, MESSAGE.errors.userNotFound);
                return;
            }

            const stats = await dbService.getDailyWaterIntake(user.id);
            if (!stats) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.getStats,
                    KeyboardUtil.getMainKeyboard()
                );
                return;
            }

            const defaultPeriod = KEYBOARD.periods.today.id;

            const message = MESSAGE.stats.message(
                MESSAGE.stats.today,
                stats,
                defaultPeriod,
                user.daily_goal
            );

            if (!message) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.getStats,
                    KeyboardUtil.getMainKeyboard()
                );
                return;
            }

            await telegramService.sendMessage(
                chatId,
                message,
                KeyboardUtil.getStatsKeyboard(defaultPeriod)
            );
        } catch (error) {
            logger.error('Error handling stats command:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.getStats,
                KeyboardUtil.getMainKeyboard()
            );
        }
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

            const debugMessageSentText = sent
                ? MESSAGE.commands.debug.testNotificationSent
                : MESSAGE.commands.debug.testNotificationNotSent;

            await telegramService.sendMessage(chatId, debugMessageSentText);
        } catch (error) {
            logger.error('Error in debug command:', error);
            await telegramService.sendMessage(msg.chat.id, MESSAGE.errors.general);
        }
    }

    async handleAdminStats(msg) {
        const chatId = msg.chat.id;

        try {
            if (!config.adminIds.includes(chatId)) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.errors.noAccess,
                    KeyboardUtil.getMainKeyboard()
                );
                return;
            }

            const defaultPeriod = KEYBOARD.adminStats.today.id;
            const users = await dbService.getAllUsers();
            let hasData = false;
            let activeUsers = 0;
            let totalWaterAll = 0;
            let totalOtherAll = 0;
            let userStatsMessage = '';

            for (const user of users) {
                const drinks = await dbService.getWaterIntakeHistory(user.id, 1);
                if (drinks && drinks.length > 0) {
                    const totalWater = drinks.reduce((sum, day) => sum + day.water, 0);
                    const totalOther = drinks.reduce((sum, day) => sum + day.other, 0);

                    if (totalWater > 0 || totalOther > 0) {
                        hasData = true;
                        activeUsers++;
                        totalWaterAll += totalWater;
                        totalOtherAll += totalOther;

                        const userIdentifiers = [];
                        if (user.first_name) userIdentifiers.push(user.first_name);
                        if (user.last_name) userIdentifiers.push(user.last_name);
                        if (user.username) userIdentifiers.push(`@${user.username}`);
                        userIdentifiers.push(`[${user.chat_id}]`);

                        userStatsMessage += MESSAGE.commands.adminStats.userStats(
                            userIdentifiers.join(' | '),
                            totalWater.toFixed(2),
                            totalOther.toFixed(2)
                        );
                    }
                }
            }

            if (!hasData) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.commands.adminStats.noData,
                    KeyboardUtil.getAdminStatsKeyboard(defaultPeriod)
                );
                return;
            }

            const message =
                MESSAGE.commands.adminStats.today +
                MESSAGE.commands.adminStats.summary(
                    users.length,
                    activeUsers,
                    totalWaterAll.toFixed(2),
                    totalOtherAll.toFixed(2)
                ) +
                userStatsMessage;

            await telegramService.sendMessage(
                chatId,
                message,
                KeyboardUtil.getAdminStatsKeyboard(defaultPeriod)
            );
        } catch (error) {
            logger.error('Error handling admin stats command:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.general,
                KeyboardUtil.getMainKeyboard()
            );
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
        bot.onText(/\/adminstats/, (msg) => this.handleAdminStats(msg));
    }
}

module.exports = new CommandHandler();

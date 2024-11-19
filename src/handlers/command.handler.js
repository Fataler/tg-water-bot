const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');
const config = require('../config/config');

class CommandHandler {
    async handleStart(msg) {
        const chatId = msg.chat.id;
        const user = await dbService.getUser(chatId);

        if (!user) {
            await telegramService.sendMessage(
                chatId, 
                '👋 Привет! Я помогу тебе следить за потреблением воды. 💧\n\n' +
                '🎯 Давай для начала установим твою цель на день:',
                KeyboardUtil.getGoalKeyboard()
            );
        } else {
            try {
                await telegramService.sendMessage(
                    chatId, 
                    '👋 С возвращением! Что будем делать? 💪',
                    KeyboardUtil.getMainKeyboard()
                );
            } catch (error) {
                if (error.response?.body?.error_code === 403 || error.response?.body?.error_code === 400) {
                    await dbService.deleteUser(chatId);
                    console.log(`Пользователь ${chatId} удален из базы данных (бот заблокирован или удален)`);
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
                        { text: '❌ Нет, отменить', callback_data: 'reset_cancel' }
                    ]
                ]
            }
        };
        await telegramService.sendMessage(
            chatId, 
            '⚠️ Ты уверен(а), что хочешь сбросить все настройки?',
            confirmKeyboard
        );
    }

    async handleAddWater(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(
            chatId,
            '🥤 Выберите тип напитка:',
            KeyboardUtil.getDrinkTypeKeyboard()
        );
    }

    async handleStats(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(
            chatId, 
            '📊 Выберите период:',
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
                    '⚙️ Настройки:',
                    KeyboardUtil.getSettingsKeyboard(user, null)
                );
                
                // Then update it with the message ID in the keyboard
                await telegramService.editMessage(
                    chatId,
                    message.message_id,
                    '⚙️ Настройки:',
                    KeyboardUtil.getSettingsKeyboard(user, message.message_id)
                );
            } catch (error) {
                console.error('Error handling settings:', error);
                await telegramService.sendMessage(
                    chatId,
                    '❌ Произошла ошибка. Попробуйте еще раз.',
                    KeyboardUtil.getMainKeyboard()
                );
            }
        }
    }

    async handleHelp(msg) {
        const chatId = msg.chat.id;
        const helpText = `🚰 *Помощь по использованию бота*\n\n` +
            `*Основные команды:*\n` +
            `💧 Добавить воду - записать выпитую воду\n` +
            `📊 Статистика - просмотр статистики потребления\n` +
            `⚙️ Настройки - изменение настроек\n` +
            `\n*Дополнительные команды:*\n` +
            `/start - перезапуск бота\n` +
            `/reset - сброс настроек\n` +
            `/help - показать эту справку\n` +
            `\n*Как пользоваться:*\n` +
            `1. Установите дневную цель потребления воды\n` +
            `2. Настройте время напоминаний\n` +
            `3. Каждый раз когда пьёте воду, нажимайте "💧 Добавить воду"\n` +
            `4. Следите за прогрессом в разделе "📊 Статистика"`;

        await telegramService.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    }

    async handleDebug(msg) {
        const chatId = msg.chat.id;
        // Проверяем, является ли пользователь администратором
        if (config.adminIds && config.adminIds.includes(chatId)) {
            try {
                const user = await dbService.getUser(chatId);
                if (!user) {
                    await telegramService.sendMessage(chatId, '❌ Пользователь не найден');
                    return;
                }
                await notificationService.sendReminder(user);
                await telegramService.sendMessage(chatId, '✅ Тестовое уведомление отправлено');
            } catch (error) {
                console.error('Error sending debug notification:', error);
                await telegramService.sendMessage(chatId, '❌ Ошибка при отправке тестового уведомления');
            }
        } else {
            await telegramService.sendMessage(chatId, '⛔️ У вас нет прав для использования этой команды');
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

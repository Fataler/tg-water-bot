const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const notificationService = require('../services/notification.service');
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');

class CommandHandler {
    async handleStart(msg) {
        const chatId = msg.chat.id;
        const user = await dbService.getUser(chatId);

        if (!user) {
            await telegramService.sendMessage(
                chatId, 
                'Привет! Я помогу тебе следить за потреблением воды. Давай настроим твои параметры.',
                KeyboardUtil.getGoalKeyboard()
            );
        } else {
            try {
                await telegramService.sendMessage(
                    chatId, 
                    'С возвращением! Что будем делать?',
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
                        { text: 'Да, сбросить', callback_data: 'reset_confirm' },
                        { text: 'Нет, отменить', callback_data: 'reset_cancel' }
                    ]
                ]
            }
        };
        await telegramService.sendMessage(
            chatId, 
            'Вы уверены, что хотите сбросить все настройки?',
            confirmKeyboard
        );
    }

    async handleAddWater(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(
            chatId,
            'Выберите тип напитка:',
            KeyboardUtil.getDrinkTypeKeyboard()
        );
    }

    async handleStats(msg) {
        const chatId = msg.chat.id;
        await telegramService.sendMessage(
            chatId, 
            'Выберите период:',
            KeyboardUtil.getStatsKeyboard()
        );
    }

    async handleSettings(msg) {
        const chatId = msg.chat.id;
        const user = await dbService.getUser(chatId);
        if (user) {
            await telegramService.sendMessage(
                chatId,
                'Настройки:',
                KeyboardUtil.createSettingsKeyboard(user)
            );
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

    setupHandlers() {
        telegramService.onText(/\/start/, this.handleStart);
        telegramService.onText(/\/reset/, this.handleReset);
        telegramService.onText(/💧 Добавить воду/, this.handleAddWater);
        telegramService.onText(/📊 Статистика/, this.handleStats);
        telegramService.onText(/⚙️ Настройки/, this.handleSettings);
        telegramService.onText(/\/help/, this.handleHelp);
    }
}

module.exports = new CommandHandler();

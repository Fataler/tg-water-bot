const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');
const callbackHandler = require('./callback.handler');
const config = require('../config/config');
const MESSAGE = require('../config/message.config');

class MessageHandler {
    async handleMessage(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        // Проверяем, ожидаем ли мы пользовательский ввод
        const userTemp = callbackHandler.userTemp.get(chatId);
        if (userTemp) {
            await this.handleCustomInput(chatId, text, userTemp);
            callbackHandler.userTemp.delete(chatId);
            return;
        }
    }

    async handleCustomInput(chatId, text, userTemp) {
        const amount = ValidationUtil.sanitizeNumber(text);

        if (!amount) {
            await telegramService.sendMessage(
                chatId,
                '⚠️ Укажи корректное число.',
                KeyboardUtil.getMainKeyboard()
            );
            return;
        }

        switch (userTemp.waitingFor) {
        case 'custom_goal':
            if (ValidationUtil.isValidGoal(amount)) {
                await dbService.addUser(chatId, amount);
                await telegramService.sendMessage(
                    chatId,
                    '🎯 Цель установлена! Можешь начинать отслеживать потребление воды.',
                    KeyboardUtil.getMainKeyboard()
                );
            } else {
                await telegramService.sendMessage(
                    chatId,
                    `⚠️ Цель должна быть от ${config.validation.water.minAmount} до ${config.validation.water.maxAmount * 2} литров.`
                );
            }
            break;

        case 'custom_water':
        case 'custom_other':
            if (ValidationUtil.isValidAmount(amount)) {
                await callbackHandler.handleDrinkIntake(
                    chatId,
                    amount,
                    userTemp.waitingFor === 'custom_water' ? 'water' : 'other'
                );
            } else {
                await telegramService.sendMessage(
                    chatId,
                    `⚠️ Количество должно быть от ${config.validation.water.minAmount} до ${config.validation.water.maxAmount} литров.`
                );
            }
            break;
        }
    }

    setupHandler() {
        telegramService.getBot().on('message', this.handleMessage.bind(this));
    }
}

module.exports = new MessageHandler();

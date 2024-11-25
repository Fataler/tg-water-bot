const telegramService = require('../services/telegram.service');
const dbService = require('../services/database.service');
const KeyboardUtil = require('../utils/keyboard.util');
const ValidationUtil = require('../utils/validation.util');
const callbackHandler = require('./callback.handler');
const config = require('../config/config');
const MESSAGE = require('../config/message.config');
const KEYBOARD = require('../config/keyboard.config');
const logger = require('../config/logger.config');

class MessageHandler {
    async handle(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;

        try {
            const user = await dbService.getUser(chatId);
            if (user) {
                await dbService.updateUserInfo(chatId, {
                    username: msg.from.username,
                    first_name: msg.from.first_name,
                    last_name: msg.from.last_name,
                });
            }

            if (!text) {
                return;
            }

            if (text === '/start') {
                if (user) {
                    callbackHandler.userTemp.delete(chatId);
                    await telegramService.sendMessage(
                        chatId,
                        MESSAGE.commands.start.welcome_back,
                        KeyboardUtil.getMainKeyboard()
                    );
                }
                return;
            }

            const userTemp = callbackHandler.userTemp.get(chatId);
            if (userTemp) {
                if (text === KEYBOARD.main.cancel.text) {
                    callbackHandler.userTemp.delete(chatId);
                    await telegramService.sendMessage(
                        chatId,
                        MESSAGE.success.operationCancelled,
                        KeyboardUtil.getMainKeyboard()
                    );
                    return;
                }

                if (userTemp.waitingFor === 'custom_goal') {
                    const amount = parseFloat(text);
                    if (!ValidationUtil.isValidGoal(amount)) {
                        await telegramService.sendMessage(
                            chatId,
                            MESSAGE.errors.validation.goal(
                                config.validation.goal.minAmount,
                                config.validation.goal.maxAmount
                            ),
                            KeyboardUtil.getCancelKeyboard()
                        );
                        return;
                    }

                    await dbService.updateUserInfo(chatId, { daily_goal: amount });
                    callbackHandler.userTemp.delete(chatId);
                    await telegramService.sendMessage(
                        chatId,
                        MESSAGE.success.goalSet,
                        KeyboardUtil.getMainKeyboard()
                    );
                    return;
                }

                if (
                    userTemp.waitingFor === 'custom_water' ||
                    userTemp.waitingFor === 'custom_other'
                ) {
                    const amount = parseFloat(text);
                    if (!ValidationUtil.isValidAmount(amount)) {
                        await telegramService.sendMessage(
                            chatId,
                            MESSAGE.errors.validation.amount(
                                config.validation.water.minAmount,
                                config.validation.water.maxAmount
                            ),
                            KeyboardUtil.getCancelKeyboard()
                        );
                        return;
                    }

                    const drinkType =
                        userTemp.waitingFor === 'custom_water'
                            ? KEYBOARD.drinks.water.id
                            : KEYBOARD.drinks.other.id;
                    await callbackHandler.handleDrinkIntake(chatId, amount, drinkType);
                    callbackHandler.userTemp.delete(chatId);
                    return;
                }
            } else if (text === KEYBOARD.main.cancel.text) {
                await telegramService.sendMessage(
                    chatId,
                    MESSAGE.commands.start.welcome_back,
                    KeyboardUtil.getMainKeyboard()
                );
                return;
            }
        } catch (error) {
            logger.error('Error handling message:', error);
            await telegramService.sendMessage(
                chatId,
                MESSAGE.errors.general,
                KeyboardUtil.getMainKeyboard()
            );
        }
    }

    setupHandler() {
        telegramService.getBot().on('message', this.handle.bind(this));
    }
}

module.exports = new MessageHandler();

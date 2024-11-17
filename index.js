require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const db = require('./database');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Инициализация базы данных
db.initDatabase();

// Клавиатуры
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['💧 Добавить воду'],
            ['📊 Статистика', '⚙️ Настройки']
        ],
        resize_keyboard: true
    }
};

const waterAmountKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '300 мл', callback_data: 'water_0.3' },
                { text: '500 мл', callback_data: 'water_0.5' }
            ],
            [
                { text: '1 л', callback_data: 'water_1' },
                { text: 'Другое количество', callback_data: 'water_custom' }
            ]
        ]
    }
};

// Клавиатура для выбора цели
const goalKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: '1.5 л', callback_data: 'goal_1.5' },
                { text: '2.0 л', callback_data: 'goal_2.0' },
                { text: '2.5 л', callback_data: 'goal_2.5' }
            ],
            [
                { text: '3.0 л', callback_data: 'goal_3.0' },
                { text: 'Другое количество', callback_data: 'goal_custom' }
            ]
        ]
    }
};

// Создаем клавиатуру с временем
function createTimeKeyboard() {
    const keyboard = [];
    let row = [];
    
    for(let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        row.push({
            text: `${hour}:00`,
            callback_data: `time_${hour}:00`
        });
        
        if(row.length === 4 || i === 23) {
            keyboard.push([...row]);
            row = [];
        }
    }
    
    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// Статистика за разные периоды
const statsKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: 'За сегодня', callback_data: 'stats_today' },
                { text: 'За неделю', callback_data: 'stats_week' }
            ],
            [
                { text: 'За месяц', callback_data: 'stats_month' },
                { text: 'За всё время', callback_data: 'stats_all' }
            ]
        ]
    }
};

// Временное хранилище для пользовательских данных
const userTemp = new Map();

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await db.getUser(chatId);

    if (!user) {
        await bot.sendMessage(chatId, 'Привет! Я помогу тебе следить за потреблением воды. Давай настроим твои параметры.');
        await bot.sendMessage(chatId, 'Выберите цель по воде в день:', goalKeyboard);
    } else {
        try {
            await bot.sendChatAction(chatId, 'typing');
            await bot.sendMessage(chatId, 'С возвращением! Что будем делать?', mainKeyboard);
        } catch (error) {
            if (error.code === 'ETELEGRAM' && (error.response.body.error_code === 403 || error.response.body.error_code === 400)) {
                await db.deleteUser(chatId);
                console.log(`Пользователь ${chatId} удален из базы данных (бот заблокирован или удален)`);
            }
        }
    }
});

// Обработка команды /reset
bot.onText(/\/reset/, async (msg) => {
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
    await bot.sendMessage(chatId, 'Вы уверены, что хотите сбросить все настройки?', confirmKeyboard);
});

// Обработка добавления воды
bot.onText(/💧 Добавить воду/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 'Сколько воды ты выпил(а)?', waterAmountKeyboard);
});

// Обработка нажатий на инлайн кнопки
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('goal_')) {
        const goal = data.split('_')[1];
        if (goal === 'custom') {
            await bot.sendMessage(chatId, 'Введите желаемую цель в литрах (например: 2.5):');
            bot.once('message', async (msg) => {
                const customGoal = parseFloat(msg.text);
                if (isNaN(customGoal) || customGoal <= 0) {
                    await bot.sendMessage(chatId, 'Пожалуйста, введите корректное число.');
                    return;
                }
                userTemp.set(chatId, { goal: customGoal });
                await bot.sendMessage(
                    chatId, 
                    `Выбрана цель: ${customGoal} л\nВ какое время вы хотите получать напоминания?`,
                    createTimeKeyboard()
                );
            });
        } else {
            const goalValue = parseFloat(goal);
            userTemp.set(chatId, { goal: goalValue });
            await bot.sendMessage(
                chatId, 
                `Выбрана цель: ${goalValue} л\nВ какое время вы хотите получать напоминания?`,
                createTimeKeyboard()
            );
        }
    } else if (data.startsWith('time_')) {
        const time = data.split('_')[1];
        const userData = userTemp.get(chatId);
        const dailyGoal = userData ? userData.goal : 2.5;
        
        await db.addUser(chatId, dailyGoal, time);
        await bot.sendMessage(
            chatId,
            `Отлично! Твои настройки:\nЦель: ${dailyGoal} л/день\nВремя напоминаний: ${time}`,
            mainKeyboard
        );
        await bot.deleteMessage(chatId, query.message.message_id);
        userTemp.delete(chatId); // Очищаем временные данные
    } else if (data.startsWith('water_')) {
        const amount = data.split('_')[1];
        if (amount === 'custom') {
            await bot.sendMessage(chatId, 'Введите количество выпитой воды в литрах (например: 0.4):');
            bot.once('message', async (msg) => {
                const customAmount = parseFloat(msg.text);
                if (isNaN(customAmount) || customAmount <= 0) {
                    await bot.sendMessage(chatId, 'Пожалуйста, введите корректное число.');
                    return;
                }
                await addWaterIntake(chatId, customAmount);
            });
        } else if (amount === 'add') {
            // Обработка кнопки "Добавить воду" из уведомления
            await bot.sendMessage(chatId, 'Сколько воды ты выпил(а)?', waterAmountKeyboard);
        } else {
            await addWaterIntake(chatId, parseFloat(amount));
        }
        // Удаляем сообщение с кнопками после выбора
        if (query.message) {
            await bot.deleteMessage(chatId, query.message.message_id);
        }
    } else if (data.startsWith('stats_')) {
        const period = data.split('_')[1];
        await showStats(chatId, period);
    } else if (data.startsWith('reset_')) {
        const action = data.split('_')[1];
        if (action === 'confirm') {
            await db.deleteUser(chatId);
            await bot.sendMessage(chatId, 'Ваши настройки сброшены. Используйте /start для новой настройки.');
        } else {
            await bot.sendMessage(chatId, 'Сброс настроек отменен.', mainKeyboard);
        }
        await bot.deleteMessage(chatId, query.message.message_id);
    } else if (data.startsWith('settings_')) {
        const action = data.split('_')[1];
        if (action === 'goal') {
            await bot.sendMessage(chatId, 'Выберите новую цель по воде:', goalKeyboard);
        } else if (action === 'time') {
            await bot.sendMessage(
                chatId,
                'Выберите новое время для уведомлений:',
                createTimeKeyboard()
            );
        } else if (action.startsWith('dnd')) {
            const status = action.split('_')[1] === 'true';
            await db.updateDoNotDisturb(chatId, status);
            await bot.sendMessage(
                chatId,
                `Уведомления ${status ? 'отключены' : 'включены'}.`
            );
            // Обновляем настройки
            const user = await db.getUser(chatId);
            const settingsKeyboard = createSettingsKeyboard(user);
            await bot.editMessageReplyMarkup(
                settingsKeyboard.reply_markup,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id
                }
            );
        }
    } else if (data.startsWith('dnd_')) {
        if (data === 'dnd_today') {
            await db.updateDoNotDisturb(chatId, true);
            await bot.sendMessage(chatId, 'Напоминания отключены до конца дня.');
            // Устанавливаем таймер на сброс статуса в полночь
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const timeUntilMidnight = tomorrow - now;
            
            setTimeout(async () => {
                await db.updateDoNotDisturb(chatId, false);
            }, timeUntilMidnight);
        }
        if (query.message) {
            await bot.deleteMessage(chatId, query.message.message_id);
        }
    }
});

// Функция создания клавиатуры настроек
function createSettingsKeyboard(user) {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Изменить цель', callback_data: 'settings_goal' }],
                [{ text: 'Изменить время уведомлений', callback_data: 'settings_time' }],
                [{ 
                    text: user.do_not_disturb ? 'Включить уведомления' : 'Отключить уведомления',
                    callback_data: `settings_dnd_${!user.do_not_disturb}`
                }]
            ]
        }
    };
}

// Обработка настроек
bot.onText(/⚙️ Настройки/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await db.getUser(chatId);

    await bot.sendMessage(
        chatId,
        `Текущие настройки:\nЦель: ${user.daily_goal} л/день\nВремя напоминаний: ${user.notification_time}\nУведомления: ${user.do_not_disturb ? 'отключены' : 'включены'}`,
        createSettingsKeyboard(user)
    );
});

// Функция добавления воды с валидацией
async function addWaterIntake(chatId, amount) {
    // Проверка на отрицательные значения и максимальное количество
    if (amount <= 0) {
        await bot.sendMessage(chatId, 'Количество воды должно быть больше 0.');
        return;
    }
    if (amount > 3) {
        await bot.sendMessage(chatId, 'Слишком большое количество воды за один раз. Максимум 3 литра.');
        return;
    }

    try {
        await db.addWaterIntake(chatId, amount);
        const today = new Date();
        const dailyTotal = await db.getDailyWaterIntake(chatId, today);
        const user = await db.getUser(chatId);

        // Создаем прогресс-бар
        const progressPercentage = Math.min((dailyTotal / user.daily_goal) * 100, 100);
        const progressBarLength = 20;
        const filledLength = Math.floor((progressPercentage * progressBarLength) / 100);
        const progressBar = '🌊'.repeat(filledLength) + '⚪'.repeat(progressBarLength - filledLength);

        let message = `Добавлено ${amount} л воды!\n\n`;
        message += `Прогресс: ${progressBar} ${progressPercentage.toFixed(1)}%\n`;
        message += `Всего за сегодня: ${dailyTotal.toFixed(2)} л из ${user.daily_goal} л\n`;
        
        if (dailyTotal >= user.daily_goal) {
            message += '\n🎉 Поздравляю! Ты достиг(ла) своей дневной цели!';
        } else {
            message += `\nОсталось: ${(user.daily_goal - dailyTotal).toFixed(2)} л до цели`;
        }

        await bot.sendMessage(chatId, message, mainKeyboard);
    } catch (error) {
        console.error('Ошибка при добавлении воды:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка при добавлении воды. Попробуйте позже.');
    }
}

// Функция показа статистики
async function showStats(chatId, period) {
    const user = await db.getUser(chatId);
    let history;
    let message = '';

    try {
        switch (period) {
            case 'today': {
                const today = new Date();
                const dailyTotal = await db.getDailyWaterIntake(chatId, today);
                const progressPercentage = Math.min((dailyTotal / user.daily_goal) * 100, 100);
                const progressBarLength = 20;
                const filledLength = Math.floor((progressPercentage * progressBarLength) / 100);
                const progressBar = '🌊'.repeat(filledLength) + '⚪'.repeat(progressBarLength - filledLength);

                message = '📊 Статистика за сегодня:\n\n';
                message += `Прогресс: ${progressBar} ${progressPercentage.toFixed(1)}%\n`;
                message += `Выпито: ${dailyTotal.toFixed(2)} л из ${user.daily_goal} л\n`;
                if (dailyTotal >= user.daily_goal) {
                    message += '✅ Цель достигнута!';
                } else {
                    message += `❌ Осталось: ${(user.daily_goal - dailyTotal).toFixed(2)} л`;
                }
                break;
            }
            case 'week':
                history = await db.getWaterHistory(chatId, 7);
                message = await formatHistoryMessage('📊 Статистика за неделю:', history);
                break;
            case 'month':
                history = await db.getWaterHistory(chatId, 30);
                message = await formatHistoryMessage('📊 Статистика за месяц:', history);
                break;
            case 'all': {
                const stats = await db.getWaterStats(chatId);
                message = '📊 Общая статистика:\n\n';
                message += `📅 Дней отслеживания: ${stats.total_days}\n`;
                message += `💧 Среднее потребление: ${stats.avg_daily} л/день\n`;
                message += `🎯 Достигнуто целей: ${stats.goals_achieved} из ${stats.total_days} дней\n`;
                message += `📈 Процент успеха: ${((stats.goals_achieved / stats.total_days) * 100).toFixed(1)}%\n`;
                
                if (stats.avg_daily >= stats.current_goal) {
                    message += '\n🌟 Отличная работа! Ты в среднем достигаешь своей цели!';
                } else {
                    const diff = stats.current_goal - stats.avg_daily;
                    message += `\n💪 Тебе нужно пить на ${diff.toFixed(2)} л больше в день для достижения цели`;
                }
                break;
            }
        }

        await bot.sendMessage(chatId, message, {
            reply_markup: statsKeyboard.reply_markup,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('Ошибка при показе статистики:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка при получении статистики. Попробуйте позже.');
    }
}

// Форматирование сообщения с историей
async function formatHistoryMessage(title, history) {
    let message = `${title}\n\n`;
    let totalAmount = 0;
    let goalsAchieved = 0;

    for (const day of history) {
        const date = new Date(day.date).toLocaleDateString('ru-RU');
        const achieved = day.total >= day.goal ? '✅' : '❌';
        const percentage = ((day.total / day.goal) * 100).toFixed(1);
        
        message += `${date}: ${day.total.toFixed(2)} л ${achieved} (${percentage}%)\n`;
        totalAmount += day.total;
        if (day.total >= day.goal) goalsAchieved++;
    }

    const avgAmount = totalAmount / history.length;
    const successRate = (goalsAchieved / history.length) * 100;

    message += `\n📈 Средний показатель: ${avgAmount.toFixed(2)} л/день`;
    message += `\n🎯 Цели достигнуты: ${goalsAchieved} из ${history.length} дней (${successRate.toFixed(1)}%)`;

    return message;
}

// Обработка статистики
bot.onText(/📊 Статистика/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, 'Выберите период:', statsKeyboard);
});

// Настройка напоминаний
function scheduleReminders() {
    schedule.scheduleJob('0 * * * *', async () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const users = await db.getAllUsers();
        for (const user of users) {
            if (user.do_not_disturb) continue;

            const [hours, minutes] = user.notification_time.split(':').map(Number);
            if (hours === currentHour && minutes === currentMinute) {
                const dailyTotal = await db.getDailyWaterIntake(user.user_id, now);
                if (dailyTotal < user.daily_goal) {
                    const remaining = user.daily_goal - dailyTotal;
                    const reminderKeyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: 'Добавить воду', callback_data: 'water_add' },
                                    { text: 'Не беспокоить сегодня', callback_data: 'dnd_today' }
                                ]
                            ]
                        }
                    };
                    await bot.sendMessage(
                        user.user_id,
                        `Напоминание: тебе осталось выпить ${remaining.toFixed(2)} л воды, чтобы достичь дневной цели.`,
                        reminderKeyboard
                    );
                }
            }
        }
    });
}

scheduleReminders();

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.error('Ошибка в боте:', error);
});

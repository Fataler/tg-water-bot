const ValidationUtil = require('../utils/validation.util');
const KEYBOARD = require('../config/keyboard.config');

const MESSAGE = {
    separator: '\n━━━━━━━━━━━━━━━━\n',
    errors: {
        addWater: '❌ Произошла ошибка при добавлении записи. Попробуйте еще раз.',
        getStats: '❌ Произошла ошибка при получении статистики. Попробуйте еще раз.',
        general: '❌ Произошла ошибка. Попробуйте еще раз.',
        validation: {
            amount: (min, max) => `⚠️ Количество должно быть от ${min} до ${max} литров.`,
            goal: (min, max) => `⚠️ Цель должна быть от ${min} до ${max} литров.`,
            invalidNumber: '⚠️ Укажи корректное число.',
        },
        noAccess: '⛔️ У вас нет прав для выполнения этой команды',
        userNotFound: '⚠️ Пользователь не найден. Используйте команду /start для регистрации.',
        unknownCommand: '⚠️ Неизвестная команда. Используйте команду /help для получения справки.',
    },
    commands: {
        start: {
            welcome:
                '👋 Привет! Я помогу тебе следить за потреблением воды. 💧\n\n🎯 Давай для начала установим твою цель на день:',
            welcome_back: '👋 С возвращением! Что будем делать? 💪',
        },
        addWater: '💧🥤 Что ты выпил(а)?',
        stats: '📊 За какой период показать статистику?',
        settings: '⚙️ Настройки:',
        help:
            '🚰 *Помощь по использованию бота*\n\n' +
            '*Основные команды:*\n' +
            '💧 Добавить воду - записать выпитую воду\n' +
            '📊 Статистика - просмотр статистики потребления\n' +
            '⚙️ Настройки - изменение настроек\n' +
            '\n*Дополнительные команды:*\n' +
            '/start - перезапуск бота\n' +
            '/reset - сброс настроек\n' +
            '/help - показать эту справку\n' +
            '\n*Как пользоваться:*\n' +
            '1. Установите дневную цель потребления воды\n' +
            '2. Каждый раз когда пьёте воду, нажимайте "💧 Добавить воду"\n' +
            '3. Следите за прогрессом в разделе "📊 Статистика"' +
            '4. Получайте напоминания о достижениидневной цели\n',
        debug: {
            testNotificationSent: '✅ Тестовое уведомление отправлено',
            testNotificationNotSent: '❌ Тестовое уведомление не отправлено',
        },
        adminStats: {
            title: '👥 Статистика использования бота',
            noData: '📊 Нет данных за выбранный период',
            today: '📅 Статистика за сегодня:',
            week: '📆 Статистика за неделю:',
            month: '📊 Статистика за месяц:',
            summary: (totalUsers, activeUsers, totalWater, totalOther) =>
                '\n📊 ОБЩАЯ СТАТИСТИКА\n' +
                `├ 👥 Всего пользователей: ${totalUsers}\n` +
                `├ 🎯 Активных за период: ${activeUsers}\n` +
                `├ 💧 Всего воды: ${totalWater}л\n` +
                `├ 🥤 Всего других напитков: ${totalOther}л\n` +
                `└ 📈 Общий объем: ${(parseFloat(totalWater) + parseFloat(totalOther)).toFixed(2)}л\n`,
            userStats: (username, totalWater, totalOther) =>
                MESSAGE.separator +
                `👤 ${username}\n` +
                `├ 💧 Вода: ${totalWater}л\n` +
                `├ 🥤 Другие напитки: ${totalOther}л\n` +
                `└ 📊 Всего: ${(parseFloat(totalWater) + parseFloat(totalOther)).toFixed(2)}л\n`,
        },
    },
    success: {
        goalSet: '🎯 Цель установлена! Можешь начинать отслеживать потребление воды.',
        waterAdded: (amount, daily, goal, type) => {
            const total = typeof daily === 'object' ? daily.total : daily;
            const percent = ValidationUtil.formatPercentage(total, goal);
            const progressEmoji = percent >= 100 ? '🎯 Цель достигнута!' : '💪 Так держать!';
            const drinkEmoji = type === KEYBOARD.drinks.water.id ? '💧' : '🥤';
            const drinkType = type === KEYBOARD.drinks.water.id ? 'воды' : 'напитка';
            const progressBar = ValidationUtil.createProgressBar(total, goal);

            return (
                `${drinkEmoji} Добавлено ${amount}л ${drinkType}\n` +
                MESSAGE.separator +
                `📊 Всего за сегодня: ${total}л из ${goal}л (${percent}%)\n` +
                `\n ${progressBar}\n` +
                `\n${progressEmoji}`
            );
        },
        reset: '✅ Настройки успешно сброшены.\n\nИспользуйте команду /start для новой регистрации.',
        operationCancelled: '❌ Операция отменена',
    },
    prompts: {
        water: {
            amount: (min, max) => `💧 Сколько литров воды ты выпил(а)? (от ${min} до ${max}л):`,
            customAmount: '💧 Сколько литров воды ты выпил(а)?',
        },
        other: {
            amount: (min, max) => `🥤 Сколько литров напитка ты выпил(а)? (от ${min} до ${max}л):`,
            customAmount: '🥤 Сколько литров напитка ты выпил(а)?',
        },
        goal: {
            set: '🎯 Укажите свою цель потребления воды в день (например: 2.5л):',
            custom: '🎯 Укажите свою цель потребления воды в день:',
        },
        reset: {
            confirm: '⚠️ Ты уверен(а), что хочешь сбросить все настройки?',
            cancel: '✨ Сброс настроек отменен',
            success:
                '✅ Настройки успешно сброшены.\n\nИспользуйте команду /start для новой регистрации.',
        },
        default: '🔔 Используйте кнопки меню для взаимодействия с ботом.',
    },
    stats: {
        header: '📊 Статистика потребления жидкости:\n\n',
        today: '📊 Статистика за сегодня',
        week: '📊 Статистика за неделю',
        month: '📊 Статистика за месяц',
        all: '📊 Статистика за все время',
        formatDailyProgress: (total, goal) => {
            const percent = goal ? ValidationUtil.formatPercentage(total, goal) : 0;
            let message = `💧 Всего: ${goal}л\n`;

            if (percent < 100) {
                const remaining = (goal - total).toFixed(2);
                message += `💧 Осталось: ${remaining}л\n`;
            }

            message += `\n${ValidationUtil.createProgressBar(total, goal)} ${percent}%\n`;

            let progressMessage = '';

            if (percent === 0) {
                progressMessage = '💧 Самое время пойти выпить воды! 🚰';
            } else if (percent >= 100) {
                progressMessage = '🎉 Дневная цель достигнута! Молодец! 🏆';
            } else if (percent >= 75) {
                progressMessage = '🎯 Уже совсем близко к цели! 💫';
            } else if (percent >= 50) {
                progressMessage = '🚀 Ты на полпути! Так держать! ⭐';
            } else if (percent >= 25) {
                progressMessage = '✨ Хороший старт! Продолжай в том же духе! 💫';
            } else {
                progressMessage = '💪 Каждый глоток приближает к цели! 🎯';
            }

            message += `\n${progressMessage}`;
            return message;
        },
        message: (title, stats, period, goal) => {
            if (!stats) {
                return '❌ Нет данных для отображения статистики';
            }

            let message = `${title}:\n`;
            let water = 0,
                other = 0,
                total = 0;

            if (period === 'week' && stats.daily) {
                stats.daily.forEach((day) => {
                    water += Number(day.water) || 0;
                    other += Number(day.other) || 0;
                });
            } else if (period === 'month' && stats.weekly) {
                stats.weekly.forEach((week) => {
                    water += Number(week.water) || 0;
                    other += Number(week.other) || 0;
                });
            } else {
                ({ water, other, total } = stats);
                water = Number(water) || 0;
                other = Number(other) || 0;
            }

            total = water + other;

            message += '\n📊 ОБЩИЕ ПОКАЗАТЕЛИ';
            message += MESSAGE.separator;
            message += `├ 💧 Вода: ${water.toFixed(2)}л\n`;
            message += `├ 🥤 Другие напитки: ${other.toFixed(2)}л\n`;
            message += `└ 📈 Всего выпито: ${total.toFixed(2)}л\n`;

            if (total > 0) {
                message += MESSAGE.separator;
                message += `${ValidationUtil.createRatioBar(water, other)}\n`;
                message += MESSAGE.separator;
            }

            if (period === 'today') {
                message += '\n🎯 ДНЕВНАЯ ЦЕЛЬ';
                message += MESSAGE.separator;
                message += MESSAGE.stats.formatDailyProgress(total, goal);
            } else if (period === 'week') {
                const { daily, previous } = stats;

                message += '\n📅 СТАТИСТИКА ПО ДНЯМ';
                message += MESSAGE.separator;
                daily.forEach((day) => {
                    if (day.total > 0) {
                        const date = new Date(day.date);
                        const dayName = date.toLocaleDateString('ru-RU', {
                            weekday: 'long',
                            day: 'numeric',
                        });
                        message += `\n${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n`;
                        message += `├ 💧 Вода: ${day.water}л\n`;
                        message += `├ 🥤 Другое: ${day.other}л\n`;
                        message += `└ 📈 Всего: ${day.total}л\n`;
                        message += `   ${ValidationUtil.createRatioBar(day.water, day.other)}\n`;
                    }
                });

                message += '\n⏮ ПРЕДЫДУЩАЯ НЕДЕЛЯ';
                message += MESSAGE.separator;
                message += `├ 💧 Вода: ${previous.water}л\n`;
                message += `├ 🥤 Другое: ${previous.other}л\n`;
                message += `└ 📈 Всего: ${previous.total}л\n`;

                if (Number(previous.total) > 0) {
                    message += `   ${ValidationUtil.createRatioBar(Number(previous.water), Number(previous.other))}\n`;
                }
            } else if (period === 'month') {
                const { weekly, previous } = stats;

                message += '\n📅 СТАТИСТИКА ПО НЕДЕЛЯМ';
                message += MESSAGE.separator;
                weekly.forEach((week) => {
                    if (week.total > 0) {
                        message += `\nНеделя ${week.week}\n`;
                        message += `├ 💧 Вода: ${week.water}л\n`;
                        message += `├ 🥤 Другое: ${week.other}л\n`;
                        message += `└ 📈 Всего: ${week.total}л\n`;
                        message += `   ${ValidationUtil.createRatioBar(Number(week.water), Number(week.other))}\n`;
                    }
                });

                message += '\n⏮ ПРЕДЫДУЩИЙ МЕСЯЦ';
                message += MESSAGE.separator;
                message += `├ 💧 Вода: ${previous.water}л\n`;
                message += `├ 🥤 Другое: ${previous.other}л\n`;
                message += `└ 📈 Всего: ${previous.total}л\n`;

                if (Number(previous.total) > 0) {
                    message += `   ${ValidationUtil.createRatioBar(Number(previous.water), Number(previous.other))}\n`;
                }
            }

            return message;
        },
        errors: {
            stats: '❌ Произошла ошибка при получении статистики. Попробуйте еще раз.',
        },
    },
    notifications: {
        enabled: '🔔 Уведомления включены! 🎉 Я буду напоминать тебе о питье воды! 💧',
        disabled: '🔕 Уведомления выключены. ⚠️ Ты можешь включить их в любой момент! 🎯',
        reminder: {
            messages: [
                '💧 Время пить воду! Не забывай о своем здоровье! 🌟',
                '🌊 Эй, водохлеб! Пора сделать глоточек! 💪',
                '💦 Твое тело жаждет воды! Дай ему то, что оно хочет! 🎯',
                '💧 Знаешь ли ты? До 60% твоего тела состоит из воды! Пора пополнить запасы! 🌊',
                '🧠 Вода улучшает работу мозга! Выпей стакан для лучшей концентрации! 💪',
                '💪 Хочешь быть сильнее? Вода помогает мышцам работать эффективнее! Время пить! 🏋️‍♂️',
                '🌱 Вода помогает выводить токсины из организма! Пора очиститься! 💧',
                '💤 Чувствуешь усталость? Возможно, тебе нужно попить воды! 🌊',
                '🏃‍♂️ Занимаешься спортом? Не забудь восполнить водный баланс! 💦',
                '🌡️ Вода помогает регулировать температуру тела! Сделай глоток! 🌊',
                '💅 Хочешь красивую кожу? Вода - твой лучший друг! Время пить! ✨',
                '🧪 Вода участвует в большинстве химических процессов в организме! Поддержи его! 💧',
                '🦷 Вода помогает сохранить здоровье зубов и дёсен! Освежись! 😁',
                '💪 Суставы любят воду! Она помогает им двигаться легче! 🏃‍♀️',
                '🫁 Вода важна для здоровья лёгких! Сделай глубокий вдох и выпей воды! 💧',
                '❤️ Сердце работает лучше, когда ты пьёшь достаточно воды! Время для глотка! 💪',
                '🧘‍♀️ Медитируешь? Не забудь про воду - она помогает сохранять ясность ума! 💧',
                '📚 Вода улучшает память и способность к обучению! Учись пить регулярно! 🎓',
                '😴 Хочешь лучше спать? Правильный питьевой режим помогает! 💤',
                '🎯 Вода помогает контролировать аппетит! Выпей стакан перед едой! 🥗',
                '🌟 Каждая клетка твоего тела нуждается в воде! Не заставляй их ждать! 💧',
                '🎨 Творческий кризис? Стакан воды может помочь! Освежи мысли! 💡',
                '🌿 Вода - источник жизни! Пришло время подпитать свой организм! 💧',
                '💧 Вода помогает поддерживать здоровье волос! Выпей стакан для красивых локонов! 💇‍♀️',
                '🏋️‍♀️ Вода помогает уменьшить мышечные спазмы! Выпей стакан после тренировки! 🏋️‍♂️',
                '🌻 Вода улучшает цвет лица! Выпей стакан для здорового и красивого лица! 💆‍♀️',
                '🌺 Вода помогает уменьшить головные боли! Выпей стакан для облегчения! 🤕',
                '🌼 Вода необходима для здоровья глаз! Пейте воду для здорового зрения! 👓',
                '🌻 Вода помогает уменьшить стресс! Выпей стакан для расслабления! 🙏',
                '🌺 Вода улучшает настроение! Выпей стакан для хорошего настроения! 😊',
                '🌼 Вода помогает уменьшить усталость! Выпей стакан для бодрости! 💪',
                '🌻 Вода необходима для здоровья кожи! Пейте воду для здоровой и красивой кожи! 🌸',
                '🌺 Вода помогает уменьшить воспаления! Выпей стакан для облегчения! 🤕',
                '🌼 Вода улучшает иммунную систему! Выпей стакан для здоровья! 🌟',
                '🌍 Знаешь ли ты? Человек может прожить без еды около месяца, но без воды только 3-4 дня! 💧',
                '🎵 Даже твои уши любят воду - она помогает поддерживать баланс внутреннего уха! 👂',
                '👾 ERROR 404: Вода не найдена в организме. Срочно исправь баг! 🔧',
                '🎭 Твой организм: Am I a joke to you? Пей воду! 😤',
                '🦈 Акулы никогда не болеют, потому что живут в воде. Совпадение? Не думаю! 🤔',
                '🌊 Вода.exe перестала отвечать. Перезапустить систему? [Да] [Определенно да] 🖥️',
                '🎮 Press F to drink water... PRESS F! PRESS F! ⌨️',
                '🦸‍♂️ С великой жаждой приходит великая ответственность! 💪',
                '🎮 Achievement Unlocked: "Водный Мастер" - Разблокируй новые способности, выпив воды! 🏆',
                '🌊 Вода: *существует* Твой организм: Водически хочется! 🏠',
                '🎭 То чувство, когда ты думал, что выпил достаточно воды... Но это было не так... 🎬',
                '🌊 404 Hydration Not Found: Пожалуйста, перезагрузите организм водой 🔄',
                '🎮 Loading... Требуется обновление системы жидкости. Установить сейчас? [ДА] [ДА] 🔄',
                '🌊 POV: Ты смотришь на стакан воды и думаешь "Да, это мой чит-код для здоровья" 💪',
                '⚡️ Вода - это как прокачка для твоего персонажа в RPG. Не забудь сделать апгрейд! 🎮',
                '🌊 *Вставьте звук открывающегося сундука из Зельды* Ты нашел легендарный стакан воды! 🏆',
                '🤔 Как говорил Гендальф: "Ты не пройдешь!"... мимо стакана воды! 🧙‍♂️',
                '🌊 Вода такая: "Ну че, как там с моим употреблением?" 🤔',
                '🎭 Спойлер: В конце дня побеждает тот, кто пил воду! 🎬',
            ],
        },
    },
};

module.exports = MESSAGE;

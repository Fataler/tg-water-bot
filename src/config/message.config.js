const ValidationUtil = require('../utils/validation.util');

const MESSAGE = {
    errors: {
        addWater: '❌ Произошла ошибка при добавлении записи. Попробуйте еще раз.',
        getStats: '❌ Произошла ошибка при получении статистики. Попробуйте еще раз.',
        general: '❌ Произошла ошибка. Попробуйте еще раз.',
        validation: {
            amount: (min, max) => `⚠️ Количество должно быть от ${min} до ${max} литров.`,
        },
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
            set: '🎯 Сколько литров воды в день ты хочешь выпивать? (например: 2.5л):',
            custom: '🎯 Сколько литров воды в день ты хочешь выпивать?',
        },
        reset: {
            confirm: '⚠️ Ты уверен(а), что хочешь сбросить все настройки?',
            cancel: '✨ Сброс настроек отменен',
        },
        default: '🔔 Используйте кнопки меню для взаимодействия с ботом.',
    },
    success: {
        goalSet: (goal) => `🎉 Отлично! Твоя цель - ${goal}л воды в день! 🎯`,
        waterAdded: (amount, daily, goal) => {
            const total = typeof daily === 'object' ? daily.total : daily;
            const percent = Math.round((total / goal) * 100);
            const progressEmoji = percent >= 100 ? '🌟' : '💪';
            return `✅ Добавлено ${amount}л!\n\n💧 Всего за сегодня: ${total}л из ${goal}л\n📊 Прогресс: ${percent}%\n\n${progressEmoji} ${percent >= 100 ? 'Дневная цель достигнута! Молодец!' : 'Продолжай в том же духе!'}`;
        },
        reset: '🔄 Все настройки сброшены. Напиши /start чтобы начать заново ✨',
    },
    stats: {
        header: '📊 Статистика потребления жидкости:\n\n',
        today: '📆 Статистика за сегодня',
        week: '📆 Статистика за неделю',
        month: '📊 Статистика за месяц',
        all: '📈 Общая статистика',
        message: (title, stats, period, goal) => {
            if (!stats) {
                return '❌ Нет данных для отображения статистики';
            }

            let message = `${title}:\n\n`;
            const progressBar = ValidationUtil.createProgressBar(stats.total, goal);

            if (period === 'today') {
                message += `💧 Вода: ${stats.water}л\n`;
                message += `🥤 Другие напитки: ${stats.other}л\n`;
                const percent = Math.round((stats.total / goal) * 100);
                const progressEmoji = percent >= 100 ? '🌟' : '✨';
                message += `📊 Всего: ${stats.total}л из ${goal}л (${percent}%)\n`;
                message += `${progressEmoji} Прогресс: ${progressBar}`;
            } else {
                message += `💧 Всего выпито: ${stats.total}л\n`;
                message += `📊 В среднем: ${stats.average}л в день\n`;
                if (stats.maxDay) {
                    message += `\n🏆 Лучший день: ${stats.maxDay.date} (${stats.maxDay.amount}л)\n`;
                }
                message += `\n${stats.total >= goal ? '🌟 Отличная работа!' : '💪 Так держать!'}`;
            }

            return message;
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
                '🚰 Не забудь про водичку! Твой организм скажет спасибо! 🙏',
                '🌿 Вода - источник жизни! Время подзарядиться! ⚡️',
                '🎭 Представь, что ты растение, которому нужен полив! 🌱',
                '🌺 Освежись! Сделай перерыв на водичку! 🌈',
                '🎪 Цирк, цирк, цирк! А ты воду пил(а)? 🎭',
                '🌊 Вика сказала, что пить воду полезно! 👩‍⚕️ А Вика плохого не посоветует! 💦',
                '🎯 Попади в цель - выпей стаканчик воды! 🎪',
                '🌟 Звезды говорят, что сейчас идеальное время для воды! ⭐️',
                '🎨 Раскрась свой день глотком свежей воды! 🖌️',
                '🎭 Пора на водное представление! Главный актер - ты! 🎪',
                '🌈 Радуга напоминает: пора пить воду! 🌦️',
                '🎪 Устрой водный карнавал своему организму! 🎭',
                '🌺 Цветы поливают, а ты воду пьешь? 🌸',
            ],
            dailyStats: (currentAmount, goal) => {
                const remaining = goal - currentAmount;
                const progressBar = ValidationUtil.createProgressBar(currentAmount, goal);

                return (
                    `📊 Твоя водная статистика на сегодня:\n\n` +
                    `🌊 Выпито: ${currentAmount} мл\n` +
                    `🎯 Цель: ${goal} мл\n` +
                    `💧 Осталось: ${remaining} мл\n\n` +
                    `Твой прогресс:\n${progressBar}`
                );
            },
        },
        reminder: (currentIntake, goal) => {
            const randomMessage =
                MESSAGE.notifications.reminder.messages[
                    Math.floor(Math.random() * MESSAGE.notifications.reminder.messages.length)
                ];
            return `${randomMessage}\n\n${MESSAGE.notifications.reminder.dailyStats(currentIntake, goal)}`;
        },
    },
};

module.exports = MESSAGE;

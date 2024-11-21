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
            const percent = ValidationUtil.formatPercentage(total, goal);
            const progressEmoji = percent >= 100 ? '🌟' : '💪';
            const progressBar = ValidationUtil.createProgressBar(total, goal);
            return `✅ Добавлено ${amount}л!\n\n💧 Всего за сегодня: ${total}л из ${goal}л\n${progressBar} ${percent}%\n\n${progressEmoji} ${percent >= 100 ? 'Дневная цель достигнута! Молодец!' : 'Продолжай в том же духе!'}`;
        },
        reset: '🔄 Все настройки сброшены. Напиши /start чтобы начать заново ✨',
    },
    stats: {
        header: '📊 Статистика потребления жидкости:\n\n',
        today: '📊 Статистика за сегодня',
        week: '📊 Статистика за неделю',
        month: '📊 Статистика за месяц',
        all: '📊 Статистика за все время',
        message: (title, stats, period, goal) => {
            if (!stats) {
                return '❌ Нет данных для отображения статистики';
            }

            const { water, other, total } = stats;
            const percent = goal ? ValidationUtil.formatPercentage(total, goal) : 0;
            const progressEmoji = percent >= 100 ? '🌟' : '💪';

            let message = `${title}:\n\n`;
            message += `💧 Вода: ${water}л\n`;
            message += `🥤 Другие напитки: ${other}л\n`;
            message += `📈 Всего: ${total}л\n`;

            if (period === 'today') {
                message += `\n🎯 Дневная цель: ${goal}л\n`;
                message += `${ValidationUtil.createProgressBar(total, goal)} ${percent}%\n`;
                message += `\n${progressEmoji} ${percent >= 100 ? 'Дневная цель достигнута! Молодец!' : 'Продолжай в том же духе!'}`;
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
                    '📊 Твоя водная статистика на сегодня:\n\n' +
                    `🌊 Выпито: ${currentAmount} л\n` +
                    `🎯 Цель: ${goal} л\n` +
                    `${remaining > 0 ? `💧 Осталось: ${remaining} мл\n\n` : ''}` +
                    `Твой прогресс:\n${progressBar}`
                );
            },
            format: (currentIntake, goal) => {
                const randomMessage =
                    MESSAGE.notifications.reminder.messages[
                        Math.floor(Math.random() * MESSAGE.notifications.reminder.messages.length)
                    ];
                return `${randomMessage}\n\n${MESSAGE.notifications.reminder.dailyStats(currentIntake, goal)}`;
            },
        },
    },
};

module.exports = MESSAGE;

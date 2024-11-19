const MESSAGE = {
    errors: {
        addWater: '❌ Произошла ошибка при добавлении записи. Попробуйте еще раз.',
        getStats: '❌ Произошла ошибка при получении статистики. Попробуйте еще раз.',
        general: '❌ Произошла ошибка. Попробуйте еще раз.',
        validation: {
            amount: (min, max) => `⚠️ Количество должно быть от ${min} до ${max} литров.`
        }
    },
    prompts: {
        water: {
            amount: (min, max) => `💧 Сколько литров воды ты выпил(а)? (от ${min} до ${max}л):`,
            customAmount: '💧 Сколько литров воды ты выпил(а)?'
        },
        other: {
            amount: (min, max) => `🥤 Сколько литров напитка ты выпил(а)? (от ${min} до ${max}л):`,
            customAmount: '🥤 Сколько литров напитка ты выпил(а)?'
        },
        goal: {
            set: '🎯 Сколько литров воды в день ты хочешь выпивать? (например: 2.5л):',
            custom: '🎯 Сколько литров воды в день ты хочешь выпивать?'
        },
        reset: {
            confirm: '⚠️ Ты уверен(а), что хочешь сбросить все настройки?',
            cancel: '✨ Сброс настроек отменен'
        },
        default: '🔔 Используйте кнопки меню для взаимодействия с ботом.'
    },
    success: {
        goalSet: (goal) => `🎉 Отлично! Твоя цель - ${goal}л воды в день! 🎯`,
        waterAdded: (amount, daily, goal) => {
            const total = typeof daily === 'object' ? daily.total : daily;
            const percent = Math.round((total / goal) * 100);
            const progressEmoji = percent >= 100 ? '🌟' : '💪';
            return `✅ Добавлено ${amount}л!\n\n💧 Всего за сегодня: ${total}л из ${goal}л\n📊 Прогресс: ${percent}%\n\n${progressEmoji} ${percent >= 100 ? 'Дневная цель достигнута! Молодец!' : 'Продолжай в том же духе!'}`;
        },
        reset: '🔄 Все настройки сброшены. Напиши /start чтобы начать заново ✨'
    },
    stats: {
        header: '📊 Статистика потребления жидкости:\n\n',
        today: '📅 Статистика за сегодня',
        week: '📆 Статистика за неделю',
        month: '📊 Статистика за месяц',
        all: '📈 Общая статистика',
        message: (title, stats, period, goal) => {
            if (!stats) {
                return '❌ Нет данных для отображения статистики';
            }

            let message = `${title}:\n\n`;

            if (period === 'today') {
                message += `💧 Вода: ${stats.water}л\n`;
                message += `🥤 Другие напитки: ${stats.other}л\n`;
                message += `📊 Всего: ${stats.total}л из ${goal}л\n`;
                const percent = Math.round((stats.total / goal) * 100);
                const progressEmoji = percent >= 100 ? '🌟' : '✨';
                message += `${progressEmoji} Прогресс: ${percent}%`;
            } else {
                message += `💧 Всего выпито: ${stats.total}л\n`;
                message += `📊 В среднем: ${stats.average}л в день\n`;
                if (stats.maxDay) {
                    message += `\n🏆 Лучший день: ${stats.maxDay.date} (${stats.maxDay.amount}л)\n`;
                }
                message += `\n${stats.total >= goal ? '🌟 Отличная работа!' : '💪 Так держать!'}`;
            }

            return message;
        }
    }
};

module.exports = MESSAGE;

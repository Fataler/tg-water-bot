class ReminderUtil {
    static messages = [
        '💧 Время для глотка воды! Поддержи свой организм в тонусе.',
        '🌊 Эй! Не забудь про водный баланс. Самое время выпить воды!',
        '💪 Хочешь оставаться энергичным? Выпей стакан воды прямо сейчас!',
        '🎯 Напоминаю о важном: пора пополнить запас воды в организме.',
        '🌿 Вода - источник жизни! Давай поддержим водный баланс вместе.',
        '⚡️ Зарядись энергией! Выпей стакан воды для бодрости.',
        '🌟 Твоё здоровье важно! Не забудь выпить воды.',
        '🎨 Раскрась свой день стаканом свежей воды!',
        '🌺 Подари своему организму глоток свежести. Время пить воду!',
        '🎉 Небольшое напоминание о важном: пора выпить воды!'
    ];

    static getRandomMessage() {
        const randomIndex = Math.floor(Math.random() * this.messages.length);
        return this.messages[randomIndex];
    }
}

module.exports = ReminderUtil;

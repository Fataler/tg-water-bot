# Water Intake Tracker Bot

Telegram бот для отслеживания потребления воды с напоминаниями и статистикой.

## Возможности

- 💧 Отслеживание потребления воды
- 🎯 Установка ежедневных целей
- 📊 Подробная статистика (день/неделя/месяц)
- ⏰ Настраиваемые напоминания
- 📈 Визуализация прогресса
- ⚙️ Гибкие настройки

## Установка

1. Клонируйте репозиторий:
```bash
git clone [url репозитория]
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` и добавьте токен бота:
```
BOT_TOKEN=your_bot_token_here
```

4. Запустите бота:
```bash
npm start
```

Для разработки используйте:
```bash
npm run dev
```

## Технологии

- Node.js
- SQLite
- node-telegram-bot-api
- node-schedule

## Команды бота

- `/start` - Начало работы/настройка бота
- `/reset` - Сброс настроек

## Лицензия

MIT

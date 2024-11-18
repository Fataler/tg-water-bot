# Water Tracker Bot

Telegram бот для отслеживания ежедневного потребления воды. Помогает пользователям следить за водным балансом и получать своевременные напоминания о необходимости пить воду.

## Возможности

- 💧 Отслеживание потребления воды
- 🎯 Установка персональных целей
- ⏰ Настраиваемые напоминания
- 📊 Статистика и аналитика
- ⚙️ Гибкие настройки

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/yourusername/tg-water-bot.git
cd tg-water-bot
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл .env и настройте переменные окружения:
```env
BOT_TOKEN=your_telegram_bot_token_here
DB_PATH=data/water_bot.db
MIN_WATER_AMOUNT=0.05
MAX_WATER_AMOUNT=3
DEFAULT_DAILY_GOAL=2
DEFAULT_NOTIFICATION_TIME=12:00
```

4. Запустите бота:
```bash
npm start
```

Для разработки используйте:
```bash
npm run dev
```

## Структура проекта

```
src/
├── config/         # Конфигурация приложения
├── services/       # Сервисы (база данных, Telegram, уведомления)
├── handlers/       # Обработчики команд и сообщений
├── utils/          # Вспомогательные утилиты
├── models/         # Модели данных
├── middlewares/    # Промежуточные обработчики
└── tests/          # Тесты
```

## Команды бота

- `/start` - Начало работы с ботом
- `/help` - Показать справку
- `/reset` - Сбросить настройки

## Разработка

1. Форкните репозиторий
2. Создайте ветку для новой функциональности (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте изменения в репозиторий (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## Тестирование

```bash
npm test
```

## Лицензия

MIT

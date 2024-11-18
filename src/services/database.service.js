const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

class DatabaseService {
    constructor() {
        this.db = null;
    }

    async init() {
        try {
            const dbPath = path.join(__dirname, '../../', config.database.path);
            const dbDir = path.dirname(dbPath);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                console.log('Создана директория для базы данных:', dbDir);
            }

            this.db = new Database(dbPath);
            await this.createTables();
            console.log('База данных успешно инициализирована');
        } catch (error) {
            console.error('Ошибка при инициализации базы данных:', error);
            throw error;
        }
    }

    async createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                daily_goal REAL NOT NULL,
                notification_time TEXT NOT NULL,
                do_not_disturb INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS water_intake (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                timestamp DATETIME DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )`
        ];

        for (const query of queries) {
            this.db.exec(query);
        }
    }

    async addUser(userId, dailyGoal, notificationTime) {
        try {
            const user = await this.getUser(userId);
            if (user) {
                this.db.prepare(
                    'UPDATE users SET daily_goal = ?, notification_time = ? WHERE user_id = ?'
                ).run(dailyGoal, notificationTime, userId);
            } else {
                this.db.prepare(
                    'INSERT INTO users (user_id, daily_goal, notification_time) VALUES (?, ?, ?)'
                ).run(userId, dailyGoal, notificationTime);
            }
        } catch (error) {
            console.error('Ошибка при добавлении/обновлении пользователя:', error);
            throw error;
        }
    }

    async getUser(userId) {
        try {
            return this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
        } catch (error) {
            console.error('Ошибка при получении пользователя:', error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            return this.db.prepare('SELECT * FROM users').all();
        } catch (error) {
            console.error('Ошибка при получении всех пользователей:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const transaction = this.db.transaction(() => {
                this.db.prepare('DELETE FROM water_intake WHERE user_id = ?').run(userId);
                this.db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);
            });
            transaction();
        } catch (error) {
            console.error('Ошибка при удалении пользователя:', error);
            throw error;
        }
    }

    async updateDoNotDisturb(userId, status) {
        try {
            this.db.prepare(
                'UPDATE users SET do_not_disturb = ? WHERE user_id = ?'
            ).run(status ? 1 : 0, userId);
        } catch (error) {
            console.error('Ошибка при обновлении статуса уведомлений:', error);
            throw error;
        }
    }

    async addWaterIntake(userId, amount) {
        try {
            this.db.prepare(
                'INSERT INTO water_intake (user_id, amount) VALUES (?, ?)'
            ).run(userId, amount);
        } catch (error) {
            console.error('Ошибка при добавлении записи о воде:', error);
            throw error;
        }
    }

    async getDailyWaterIntake(userId, date) {
        try {
            const result = this.db.prepare(`
                SELECT COALESCE(SUM(amount), 0) as total
                FROM water_intake 
                WHERE user_id = ? 
                AND date(timestamp, 'localtime') = date(?, 'localtime')
            `).get(userId, date.toISOString());
            
            return result.total;
        } catch (error) {
            console.error('Ошибка при получении дневного потребления воды:', error);
            throw error;
        }
    }

    async getWaterHistory(userId, days) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days + 1); // +1 чтобы включить текущий день
            
            const result = this.db.prepare(`
                WITH RECURSIVE dates(date) AS (
                    SELECT date(datetime('now', 'localtime'))
                    UNION ALL
                    SELECT date(date, '-1 day')
                    FROM dates
                    WHERE date > date(?, 'localtime')
                )
                SELECT 
                    dates.date,
                    COALESCE(SUM(wi.amount), 0) as amount
                FROM dates
                LEFT JOIN water_intake wi ON date(wi.timestamp, 'localtime') = dates.date 
                    AND wi.user_id = ?
                GROUP BY dates.date
                ORDER BY dates.date DESC
                LIMIT ?
            `).all(startDate.toISOString(), userId, days);

            const total = result.reduce((sum, day) => sum + day.amount, 0);
            const average = total / days;
            const daysWithRecords = result.filter(day => day.amount > 0).length;
            
            let max = 0;
            let maxDate = null;
            
            for (const day of result) {
                if (day.amount > max) {
                    max = day.amount;
                    maxDate = day.date;
                }
            }

            return {
                total,
                average,
                max,
                maxDate,
                daysWithRecords,
                totalDays: days,
                dailyData: result
            };
        } catch (error) {
            console.error('Ошибка при получении истории потребления воды:', error);
            throw error;
        }
    }

    async getWaterStats(userId) {
        try {
            const result = this.db.prepare(`
                WITH daily_stats AS (
                    SELECT 
                        date(timestamp, 'localtime') as date,
                        SUM(amount) as daily_total
                    FROM water_intake
                    WHERE user_id = ?
                    GROUP BY date(timestamp, 'localtime')
                )
                SELECT 
                    COUNT(date) as days,
                    COALESCE(SUM(daily_total), 0) as total,
                    COALESCE(MAX(daily_total), 0) as max_daily,
                    COALESCE(MAX(CASE WHEN daily_total = MAX(daily_total) OVER () THEN date END), '') as max_date
                FROM daily_stats
            `).get(userId);

            return {
                days: result.days,
                total: result.total,
                average: result.days > 0 ? result.total / result.days : 0,
                max: result.max_daily,
                maxDate: result.max_date
            };
        } catch (error) {
            console.error('Ошибка при получении статистики потребления воды:', error);
            throw error;
        }
    }

    close() {
        try {
            if (this.db) {
                this.db.close();
                console.log('Соединение с базой данных закрыто');
            }
        } catch (error) {
            console.error('Ошибка при закрытии базы данных:', error);
            throw error;
        }
    }
}

module.exports = new DatabaseService();

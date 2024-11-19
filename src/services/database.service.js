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
                do_not_disturb INTEGER DEFAULT 0,
                last_drink_time DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                notification_time TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS water_intake (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                drink_type TEXT DEFAULT 'water',
                timestamp DATETIME DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )`
        ];

        for (const query of queries) {
            this.db.exec(query);
        }

        // Добавляем индекс для оптимизации запросов
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON water_intake(user_id, timestamp)`);
    }

    async addUser(userId, dailyGoal) {
        try {
            const user = await this.getUser(userId);
            if (user) {
                this.db.prepare(
                    'UPDATE users SET daily_goal = ? WHERE user_id = ?'
                ).run(dailyGoal, userId);
            } else {
                // Set a default notification time that won't be used
                this.db.prepare(
                    'INSERT INTO users (user_id, daily_goal, notification_time) VALUES (?, ?, ?)'
                ).run(userId, dailyGoal, '12:00');
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
            this.db.prepare('UPDATE users SET do_not_disturb = ? WHERE user_id = ?').run(status ? 1 : 0, userId);
        } catch (error) {
            console.error('Ошибка при обновлении статуса уведомлений:', error);
            throw error;
        }
    }

    async getLastDrinkTime(userId) {
        try {
            const result = this.db.prepare('SELECT last_drink_time FROM users WHERE user_id = ?').get(userId);
            return result?.last_drink_time ? new Date(result.last_drink_time) : null;
        } catch (error) {
            console.error('Ошибка при получении времени последнего напитка:', error);
            throw error;
        }
    }

    async addWaterIntake(userId, amount, drinkType = 'water') {
        try {
            const transaction = this.db.transaction(() => {
                // Add water intake record with automatic timestamp
                this.db.prepare(
                    'INSERT INTO water_intake (user_id, amount, drink_type) VALUES (?, ?, ?)'
                ).run(userId, amount, drinkType);
                
                // Update last drink time using strftime
                this.db.prepare(
                    `UPDATE users SET last_drink_time = strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime') WHERE user_id = ?`
                ).run(userId);
            });
            transaction();
        } catch (error) {
            console.error('Ошибка при добавлении записи о потреблении воды:', error);
            throw error;
        }
    }

    async getDailyWaterIntake(userId, date = new Date()) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const stmt = this.db.prepare(`
            SELECT ROUND(SUM(amount), 2) as total,
                   ROUND(SUM(CASE WHEN drink_type = 'water' THEN amount ELSE 0 END), 2) as water,
                   ROUND(SUM(CASE WHEN drink_type = 'other' THEN amount ELSE 0 END), 2) as other
            FROM water_intake 
            WHERE user_id = ? 
            AND timestamp BETWEEN datetime(?, 'localtime') AND datetime(?, 'localtime')
        `);

        const result = stmt.get(
            userId,
            startOfDay.toISOString(),
            endOfDay.toISOString()
        );

        return {
            total: Number((result.total || 0).toFixed(2)),
            water: Number((result.water || 0).toFixed(2)),
            other: Number((result.other || 0).toFixed(2))
        };
    }

    async getWaterHistory(userId, days) {
        const stmt = this.db.prepare(`
            SELECT 
                date(timestamp, 'localtime') as date,
                SUM(amount) as total,
                SUM(CASE WHEN drink_type = 'water' THEN amount ELSE 0 END) as water,
                SUM(CASE WHEN drink_type = 'other' THEN amount ELSE 0 END) as other
            FROM water_intake 
            WHERE user_id = ? 
            AND timestamp >= datetime('now', '-' || ? || ' days', 'localtime')
            GROUP BY date(timestamp, 'localtime')
            ORDER BY date DESC
        `);

        const results = stmt.all(userId, days);
        return results.map(row => ({
            date: row.date,
            total: row.total || 0,
            water: row.water || 0,
            other: row.other || 0
        }));
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
                ),
                max_stats AS (
                    SELECT MAX(daily_total) as max_total
                    FROM daily_stats
                )
                SELECT 
                    COUNT(ds.date) as days,
                    COALESCE(SUM(ds.daily_total), 0) as total,
                    COALESCE(MAX(ds.daily_total), 0) as max_daily,
                    COALESCE((
                        SELECT date 
                        FROM daily_stats 
                        WHERE daily_total = max_stats.max_total 
                        LIMIT 1
                    ), '') as max_date
                FROM daily_stats ds, max_stats
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

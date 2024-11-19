const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const logger = require('../config/logger.config');
const runMigrations = require('../database/migrate');

class DatabaseService {
    constructor() {
        this.db = null;
    }

    getMode() {
        return process.env.IS_DOCKER === 'true' ? 'Docker' : 'Local';
    }

    getDbPath() {
        return this.getMode() === 'Docker'
            ? config.database.path
            : path.join(__dirname, '../../', config.database.path);
    }

    exists() {
        const dbPath = this.getDbPath();
        return fs.existsSync(dbPath);
    }

    async init() {
        try {
            logger.info('Initializing database connection...');
            const dbPath = this.getDbPath();
            const dbDir = path.dirname(dbPath);

            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                logger.info(`Created database directory: ${dbDir}`);
            }

            this.db = new Database(dbPath);
            await runMigrations(this.db);
            logger.info('Database initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize database:', error);
            throw error;
        }
    }

    async addUser(userId, dailyGoal) {
        try {
            const user = await this.getUser(userId);
            if (user) {
                this.db
                    .prepare('UPDATE users SET daily_goal = ? WHERE chat_id = ?')
                    .run(dailyGoal, userId);
                return user;
            }

            const result = this.db
                .prepare('INSERT INTO users (chat_id, daily_goal) VALUES (?, ?)')
                .run(userId, dailyGoal);
            return { id: result.lastInsertRowid, chat_id: userId, daily_goal: dailyGoal };
        } catch (error) {
            logger.error('Error adding user:', error);
            throw error;
        }
    }

    async getUser(userId) {
        try {
            return this.db.prepare('SELECT * FROM users WHERE chat_id = ?').get(userId);
        } catch (error) {
            logger.error('Error getting user:', error);
            throw error;
        }
    }

    async addWaterIntake(userId, amount, drinkType = 'water') {
        try {
            const user = await this.getUser(userId);
            if (!user) {
                logger.error('User not found for water intake:', userId);
                throw new Error('User not found');
            }

            const result = this.db
                .prepare('INSERT INTO water_intake (user_id, amount, drink_type) VALUES (?, ?, ?)')
                .run(user.id, amount, drinkType);

            return result.lastInsertRowid;
        } catch (error) {
            logger.error('Error adding water intake:', error);
            throw error;
        }
    }

    async getDailyWaterIntake(userId) {
        try {
            const user = await this.getUser(userId);
            if (!user) throw new Error('User not found');

            const result = this.db
                .prepare(
                    `
                SELECT 
                    ROUND(COALESCE(SUM(CASE WHEN drink_type = 'water' THEN amount ELSE 0 END), 0), 2) as water,
                    ROUND(COALESCE(SUM(CASE WHEN drink_type != 'water' THEN amount ELSE 0 END), 0), 2) as other,
                    ROUND(COALESCE(SUM(amount), 0), 2) as total
                FROM water_intake
                WHERE user_id = ?
                AND date(timestamp) = date('now', 'localtime')
            `
                )
                .get(user.id);

            return {
                water: Number(result.water),
                other: Number(result.other),
                total: Number(result.total),
            };
        } catch (error) {
            logger.error('Error getting daily water intake:', error);
            throw error;
        }
    }

    async updateSettings(userId, settings) {
        try {
            const user = await this.getUser(userId);
            if (!user) throw new Error('User not found');

            const updates = [];
            const params = [];

            if (settings.hasOwnProperty('daily_goal')) {
                updates.push('daily_goal = ?');
                params.push(settings.daily_goal);
            }

            if (settings.hasOwnProperty('notification_time')) {
                updates.push('notification_time = ?');
                params.push(settings.notification_time);
            }

            if (settings.hasOwnProperty('notification_enabled')) {
                updates.push('notification_enabled = ?');
                params.push(settings.notification_enabled);
            }

            if (updates.length === 0) return user;

            params.push(userId);
            const query = `UPDATE users SET ${updates.join(', ')} WHERE chat_id = ?`;
            this.db.prepare(query).run(...params);

            return this.getUser(userId);
        } catch (error) {
            logger.error('Error updating settings:', error);
            throw error;
        }
    }

    async getWaterIntakeHistory(userId, limit = 5) {
        try {
            const user = await this.getUser(userId);
            if (!user) throw new Error('User not found');

            const dailyIntakes = this.db
                .prepare(
                    `
                SELECT 
                    date(timestamp, 'localtime') as date,
                    ROUND(COALESCE(SUM(CASE WHEN drink_type = 'water' THEN amount ELSE 0 END), 0), 2) as water,
                    ROUND(COALESCE(SUM(CASE WHEN drink_type != 'water' THEN amount ELSE 0 END), 0), 2) as other,
                    ROUND(COALESCE(SUM(amount), 0), 2) as total
                FROM water_intake
                WHERE user_id = ?
                AND date(timestamp, 'localtime') >= date('now', '-' || ? || ' days', 'localtime')
                GROUP BY date(timestamp, 'localtime')
                ORDER BY date DESC
            `
                )
                .all(user.id, limit);

            if (dailyIntakes.length === 0) {
                return {
                    total: 0,
                    average: 0,
                };
            }

            const total = dailyIntakes.reduce((sum, day) => sum + day.total, 0);
            const average = Number((total / limit).toFixed(2));

            let maxDay = dailyIntakes[0];
            for (const day of dailyIntakes) {
                if (day.total > maxDay.total) {
                    maxDay = day;
                }
            }

            return {
                total: Number(total.toFixed(2)),
                average,
                maxDay:
                    dailyIntakes.length > 0
                        ? {
                            date: maxDay.date,
                            amount: maxDay.total,
                        }
                        : null,
            };
        } catch (error) {
            logger.error('Error getting water intake history:', error);
            throw error;
        }
    }

    async getUsersForNotification(time) {
        try {
            return this.db
                .prepare(
                    `
                SELECT * FROM users 
                WHERE notification_time = ? 
                AND notification_enabled = 1
            `
                )
                .all(time);
        } catch (error) {
            logger.error('Error getting users for notification:', error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            return this.db.prepare('SELECT * FROM users').all();
        } catch (error) {
            logger.error('Error getting all users:', error);
            throw error;
        }
    }

    async getWaterStats(userId) {
        try {
            const user = await this.getUser(userId);
            if (!user) throw new Error('User not found');

            const stats = this.db
                .prepare(
                    `
                WITH daily_totals AS (
                    SELECT 
                        date(timestamp, 'localtime') as date,
                        ROUND(SUM(amount), 2) as daily_total
                    FROM water_intake
                    WHERE user_id = ?
                    GROUP BY date(timestamp, 'localtime')
                )
                SELECT 
                    COUNT(*) as days,
                    ROUND(SUM(daily_total), 2) as total,
                    ROUND(AVG(daily_total), 2) as average,
                    ROUND(MAX(daily_total), 2) as max,
                    (
                        SELECT date 
                        FROM daily_totals 
                        WHERE daily_total = (SELECT MAX(daily_total) FROM daily_totals)
                        LIMIT 1
                    ) as max_date
                FROM daily_totals
            `
                )
                .get(user.id);

            return {
                days: stats.days,
                total: stats.total || 0,
                average: stats.average || 0,
                max: stats.max || 0,
                maxDate: stats.max_date || 'Нет данных',
            };
        } catch (error) {
            logger.error('Error getting water stats:', error);
            throw error;
        }
    }

    async deleteUser(chatId) {
        try {
            const user = await this.getUser(chatId);
            if (!user) {
                logger.warn('User not found for deletion:', chatId);
                return;
            }

            // Удаляем записи о потреблении воды
            this.db.prepare('DELETE FROM water_intake WHERE user_id = ?').run(user.id);

            // Удаляем пользователя
            this.db.prepare('DELETE FROM users WHERE chat_id = ?').run(chatId);

            logger.info('User deleted successfully:', chatId);
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = new DatabaseService();

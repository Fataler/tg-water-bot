const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const logger = require('../config/logger.config');
const runMigrations = require('../database/migrate');

async function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

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
            const dbPath = this.getDbPath();
            await ensureDirectoryExists(path.dirname(dbPath));

            this.db = new Database(dbPath);
            await runMigrations(this.db);
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

    async getUser(chatId) {
        try {
            const user = this.db.prepare('SELECT * FROM users WHERE chat_id = ?').get(chatId);
            if (user) {
                // Преобразуем notification_enabled в булево значение
                user.notification_enabled = Boolean(user.notification_enabled);
            }
            return user;
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
        return this.getWaterIntakeHistory(userId, 1);
    }

    async getWeeklyWaterIntake(userId) {
        return this.getWaterIntakeHistory(userId, 7);
    }

    async getMonthlyWaterIntake(userId) {
        return this.getWaterIntakeHistory(userId, 30);
    }

    async getAllTimeWaterIntake(userId) {
        return this.getWaterIntakeHistory(userId, 365);
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
                    water: 0,
                    other: 0,
                    total: 0
                };
            }

            const total = dailyIntakes.reduce((sum, day) => sum + day.total, 0);
            const water = dailyIntakes.reduce((sum, day) => sum + day.water, 0);
            const other = dailyIntakes.reduce((sum, day) => sum + day.other, 0);

            return {
                water: Number(water.toFixed(2)),
                other: Number(other.toFixed(2)),
                total: Number(total.toFixed(2))
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
                WHERE notification_enabled = 1
            `
                )
                .all();
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

    async updateUser(chatId, updates) {
        try {
            const user = await this.getUser(chatId);
            if (!user) {
                logger.warn('User not found for update:', chatId);
                return;
            }

            const setClause = Object.entries(updates)
                .map(([key]) => `${key} = ?`)
                .join(', ');
            const values = Object.values(updates);

            this.db
                .prepare(`UPDATE users SET ${setClause} WHERE chat_id = ?`)
                .run(...values, chatId);

            logger.info('User updated successfully:', chatId);
            return await this.getUser(chatId);
        } catch (error) {
            logger.error('Error updating user:', error);
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

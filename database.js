const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('water_tracker.db');

// Инициализация базы данных
function initDatabase() {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            daily_goal REAL NOT NULL,
            notification_time TEXT NOT NULL,
            do_not_disturb INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица записей потребления воды
        db.run(`CREATE TABLE IF NOT EXISTS water_intake (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )`);
    });
}

// Добавление нового пользователя
function addUser(userId, dailyGoal, notificationTime) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT OR REPLACE INTO users (user_id, daily_goal, notification_time) VALUES (?, ?, ?)',
            [userId, dailyGoal, notificationTime],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// Получение информации о пользователе
function getUser(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Добавление записи о потреблении воды
function addWaterIntake(userId, amount) {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();
        const query = `
            INSERT INTO water_intake (user_id, amount, timestamp) 
            VALUES (?, ?, datetime(?))
        `;
        
        db.run(query, [userId, amount, now], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Получение суммы выпитой воды за день
function getDailyWaterIntake(userId, date) {
    return new Promise((resolve, reject) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const query = `
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM water_intake 
            WHERE user_id = ? 
            AND datetime(timestamp) >= datetime(?)
            AND datetime(timestamp) <= datetime(?)
        `;

        db.get(
            query,
            [
                userId, 
                startOfDay.toISOString(), 
                endOfDay.toISOString()
            ],
            (err, row) => {
                if (err) reject(err);
                else resolve(row.total);
            }
        );
    });
}

// Получение истории потребления воды
function getWaterHistory(userId, days = 7) {
    return new Promise((resolve, reject) => {
        const query = `
            WITH RECURSIVE dates(date) AS (
                SELECT date('now', 'localtime', '-' || ? || ' days')
                UNION ALL
                SELECT date(date, '+1 day')
                FROM dates
                WHERE date < date('now', 'localtime')
            )
            SELECT 
                dates.date,
                COALESCE(SUM(wi.amount), 0) as total,
                (SELECT daily_goal FROM users WHERE user_id = ?) as goal
            FROM dates
            LEFT JOIN water_intake wi ON 
                date(wi.timestamp) = dates.date AND 
                wi.user_id = ?
            GROUP BY dates.date
            ORDER BY dates.date DESC
        `;

        db.all(query, [days - 1, userId, userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Получение средних показателей
function getWaterStats(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                COUNT(DISTINCT date(timestamp)) as total_days,
                ROUND(AVG(daily_total), 2) as avg_daily,
                (
                    SELECT COUNT(*) 
                    FROM (
                        SELECT date(timestamp) as day, SUM(amount) as daily
                        FROM water_intake
                        WHERE user_id = ?
                        GROUP BY date(timestamp)
                        HAVING daily >= (SELECT daily_goal FROM users WHERE user_id = ?)
                    )
                ) as goals_achieved,
                (SELECT daily_goal FROM users WHERE user_id = ?) as current_goal
            FROM (
                SELECT date(timestamp) as date, SUM(amount) as daily_total
                FROM water_intake
                WHERE user_id = ?
                GROUP BY date(timestamp)
            )
        `;

        db.get(query, [userId, userId, userId, userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Обновление статуса "не беспокоить"
function updateDoNotDisturb(userId, status) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET do_not_disturb = ? WHERE user_id = ?',
            [status ? 1 : 0, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// Получение всех пользователей
function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Удаление пользователя и всех его записей
function deleteUser(userId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Начинаем транзакцию
            db.run('BEGIN TRANSACTION');

            // Удаляем записи о воде
            db.run('DELETE FROM water_intake WHERE user_id = ?', [userId], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                }

                // Удаляем пользователя
                db.run('DELETE FROM users WHERE user_id = ?', [userId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }

                    // Завершаем транзакцию
                    db.run('COMMIT', (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });
        });
    });
}

module.exports = {
    initDatabase,
    addUser,
    getUser,
    addWaterIntake,
    getDailyWaterIntake,
    getWaterHistory,
    getWaterStats,
    updateDoNotDisturb,
    getAllUsers,
    deleteUser
};

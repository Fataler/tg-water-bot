const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config/config');

async function migrate() {
    try {
        const dbPath = path.join(__dirname, '../../', config.database.path);
        const db = new Database(dbPath);

        const migration = db.transaction(() => {
            console.log('Starting migration to remove notification_time column...');
            
            // Get existing foreign key constraints
            const foreignKeys = db.prepare(`
                SELECT sql 
                FROM sqlite_master 
                WHERE type='table' AND name='water_intake'
            `).get();

            // Disable foreign key checks
            db.prepare('PRAGMA foreign_keys = OFF').run();

            // Backup water_intake table
            db.prepare('ALTER TABLE water_intake RENAME TO water_intake_backup').run();
            
            // Create new users table
            db.prepare(`
                CREATE TABLE users_new (
                    user_id INTEGER PRIMARY KEY,
                    daily_goal REAL NOT NULL,
                    do_not_disturb INTEGER DEFAULT 0,
                    last_drink_time DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `).run();

            // Copy users data
            db.prepare(`
                INSERT INTO users_new (user_id, daily_goal, do_not_disturb, last_drink_time, created_at)
                SELECT user_id, daily_goal, do_not_disturb, last_drink_time, created_at
                FROM users
            `).run();

            // Drop old users table
            db.prepare('DROP TABLE users').run();

            // Rename new users table
            db.prepare('ALTER TABLE users_new RENAME TO users').run();

            // Recreate water_intake table with foreign keys
            db.prepare(`
                CREATE TABLE water_intake (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    drink_type TEXT DEFAULT 'water',
                    timestamp DATETIME DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            `).run();

            // Copy water_intake data back
            db.prepare(`
                INSERT INTO water_intake (id, user_id, amount, drink_type, timestamp)
                SELECT id, user_id, amount, drink_type, timestamp
                FROM water_intake_backup
            `).run();

            // Drop backup table
            db.prepare('DROP TABLE water_intake_backup').run();

            // Recreate index
            db.prepare(`CREATE INDEX idx_water_intake_user_date ON water_intake(user_id, timestamp)`).run();

            // Re-enable foreign key checks
            db.prepare('PRAGMA foreign_keys = ON').run();

            console.log('Migration completed successfully!');
        });

        migration();
        db.close();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

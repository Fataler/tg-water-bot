const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config/config');

async function migrate() {
    const dbPath = path.join(__dirname, '../../', config.database.path);
    const db = new Database(dbPath);

    try {
        // Add drink_type column if it doesn't exist
        db.exec(`
            PRAGMA foreign_keys=off;
            
            BEGIN TRANSACTION;
            
            -- Create temporary table
            CREATE TABLE water_intake_backup (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                drink_type TEXT DEFAULT 'water',
                timestamp DATETIME DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            );
            
            -- Copy data
            INSERT INTO water_intake_backup (id, user_id, amount, timestamp)
            SELECT id, user_id, amount, timestamp FROM water_intake;
            
            -- Drop old table
            DROP TABLE water_intake;
            
            -- Rename backup table
            ALTER TABLE water_intake_backup RENAME TO water_intake;
            
            COMMIT;
            
            PRAGMA foreign_keys=on;
        `);
        
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

migrate();

const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config/config');

async function migrate() {
    try {
        const dbPath = path.join(__dirname, '../../', config.database.path);
        const db = new Database(dbPath);

        // Add last_drink_time column if it doesn't exist
        const migration = db.transaction(() => {
            // Check if column exists
            const columns = db.prepare(`PRAGMA table_info(users)`).all();
            const hasLastDrinkTime = columns.some(col => col.name === 'last_drink_time');
            
            if (!hasLastDrinkTime) {
                console.log('Adding last_drink_time column...');
                db.prepare(`ALTER TABLE users ADD COLUMN last_drink_time DATETIME`).run();
                
                // Update last_drink_time for existing users based on their last water intake
                db.prepare(`
                    UPDATE users 
                    SET last_drink_time = (
                        SELECT MAX(timestamp) 
                        FROM water_intake 
                        WHERE water_intake.user_id = users.user_id
                    )
                `).run();
                
                console.log('Migration completed successfully!');
            } else {
                console.log('Column last_drink_time already exists. No migration needed.');
            }
        });

        migration();
        db.close();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

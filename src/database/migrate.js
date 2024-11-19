const umzug = require('./migration.config');
const logger = require('../config/logger.config');

async function runMigrations() {
    try {
        logger.info('Starting database migrations...');
        const migrations = await umzug.up();

        if (migrations.length === 0) {
            logger.info('No new migrations to run');
        } else {
            logger.info(`Executed ${migrations.length} migrations successfully`);
            migrations.forEach((migration) => {
                logger.info(`- ${migration.name}`);
            });
        }
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations;

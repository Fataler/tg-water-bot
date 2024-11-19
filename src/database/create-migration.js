const fs = require('fs');
const path = require('path');
const logger = require('../config/logger.config');

function createMigration() {
    const timestamp = new Date()
        .toISOString()
        .replace(/[^0-9]/g, '')
        .slice(0, -3);
    const name = process.argv[2];

    if (!name) {
        logger.error('Please provide a migration name');
        logger.info('Usage: npm run migrate:create [migration-name]');
        process.exit(1);
    }

    const fileName = `${timestamp}-${name}.js`;
    const migrationsDir = path.join(__dirname, 'migrations');
    const filePath = path.join(migrationsDir, fileName);

    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const template = `module.exports = {
    async up(db) {
        // Add migration code here
        db.exec(\`
            -- Your SQL code here
        \`);
    },

    async down(db) {
        // Add rollback code here
        db.exec(\`
            -- Your rollback SQL code here
        \`);
    }
};
`;

    fs.writeFileSync(filePath, template);
    logger.info(`Created migration: ${fileName}`);
}

createMigration();

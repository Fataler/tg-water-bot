const path = require('path');
const { Umzug } = require('umzug');
const Database = require('better-sqlite3');
const logger = require('../config/logger.config');
const config = require('../config/config');

const dbPath = path.join(__dirname, '../../', config.database.path);
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        executed_at INTEGER
    )
`);

const umzug = new Umzug({
    migrations: {
        glob: ['migrations/*.js', { cwd: __dirname }],
        resolve: ({ name, path, context }) => {
            const migration = require(path);
            return {
                name,
                up: async () => {
                    logger.info(`Running migration up: ${name}`);
                    return migration.up(context);
                },
                down: async () => {
                    logger.info(`Running migration down: ${name}`);
                    return migration.down(context);
                },
            };
        },
    },
    context: db,
    storage: {
        async executed() {
            const results = db.prepare('SELECT name FROM migrations').all();
            return results.map((row) => row.name);
        },
        async logMigration({ name }) {
            db.prepare('INSERT INTO migrations (name, executed_at) VALUES (?, ?)').run(
                name,
                Date.now()
            );
        },
        async unlogMigration({ name }) {
            db.prepare('DELETE FROM migrations WHERE name = ?').run(name);
        },
    },
    logger: logger,
});

module.exports = umzug;

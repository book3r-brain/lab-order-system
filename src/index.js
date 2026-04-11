/**
 * Production entrypoint.
 *
 * Loads dotenv (for local development), builds the app via the factory,
 * and binds to the configured port. All runtime error surfaces go
 * through the app's central error middleware — this file intentionally
 * contains no request handling.
 */
require('dotenv').config();

const createApp = require('./app');
const { logger } = require('./logger');

function main() {
    let app;
    try {
        app = createApp();
    } catch (err) {
        // Boot-time config errors are logged through the structured
        // logger and then rethrown so the process exits non-zero.
        logger.fatal(
            { err: { name: err.name, message: err.message, code: err.code } },
            'failed_to_start'
        );
        process.exit(1);
    }

    const port = Number(process.env.PORT) || 8080;
    app.listen(port, () => {
        logger.info({ port, env: process.env.NODE_ENV }, 'listening');
    });
}

main();

const secureLogger = require('../services/secure-logger');

async function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    await secureLogger.logError(err, req, {
        environment: process.env.NODE_ENV || 'development',
        errorContext: err.context || null,
    });

    const statusCode = Number.isInteger(err.status) && err.status >= 400 && err.status < 600
        ? err.status
        : 500;

    const responseBody = statusCode >= 500
        ? { error: 'Internal Server Error' }
        : { error: err.publicMessage || 'Request could not be processed' };

    return res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;

'use strict';

/**
 * Wrap an async Express route handler so that rejected promises are
 * forwarded to the global error-handling middleware instead of being
 * swallowed (which in Express 4 leads to a hung connection and an
 * UnhandledPromiseRejection warning).
 *
 * Usage:
 *   router.get('/:id', asyncHandler(async (req, res) => { ... }));
 */
module.exports = function asyncHandler(fn) {
    return function wrapped(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

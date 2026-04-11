/**
 * Central error middleware and 404 handler.
 *
 * All HTTP error responses in the application go through this pair so
 * that the wire format is exactly:
 *
 *   { "error": "<machine_code>", "request_id": "<uuid>" }
 *
 * No `e.message`, no `stack`, no library internals. Full error context
 * including stacks is logged server-side via the structured logger and
 * correlated by `request_id`.
 *
 * This is the control that closes SCR finding ER-01 and satisfies
 * T-P1-4 and T-P1-5.
 */
const { logger } = require('../logger');

/**
 * Translate body-parser and common Express errors to stable client codes.
 */
function codeForError(err) {
    if (err && err.code) return err.code;
    if (!err) return 'internal_error';

    // body-parser-style errors:
    if (err.type === 'entity.too.large') return 'payload_too_large';
    if (err.type === 'entity.parse.failed') return 'invalid_json';
    if (err.type === 'charset.unsupported') return 'unsupported_charset';
    if (err.type === 'encoding.unsupported') return 'unsupported_encoding';
    if (err.type === 'request.aborted') return 'request_aborted';

    if (err.status === 415 || err.statusCode === 415)
        return 'unsupported_media_type';
    if (err.status === 413 || err.statusCode === 413)
        return 'payload_too_large';
    if (err.status === 429 || err.statusCode === 429)
        return 'rate_limited';
    if (err.status === 400 || err.statusCode === 400)
        return 'bad_request';

    return 'internal_error';
}

function statusForError(err) {
    if (!err) return 500;
    if (err.statusCode) return err.statusCode;
    if (err.status) return err.status;
    if (err.type === 'entity.too.large') return 413;
    if (err.type === 'entity.parse.failed') return 400;
    if (err.type === 'charset.unsupported') return 415;
    if (err.type === 'encoding.unsupported') return 415;
    return 500;
}

function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'not_found',
        request_id: req.id,
    });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = statusForError(err);
    const code = codeForError(err);

    logger.error(
        {
            err: {
                name: err && err.name,
                message: err && err.message,
                stack: err && err.stack,
                code,
            },
            request_id: req.id,
            endpoint: req.originalUrl || req.url,
            method: req.method,
        },
        'request_error'
    );

    res.status(status).json({
        error: code,
        request_id: req.id,
    });
}

module.exports = { errorHandler, notFoundHandler };

'use strict';

const crypto = require('crypto');

const logger = require('../logger');

/**
 * Terminal Express error-handling middleware.
 *
 * Security properties:
 *  - Client sees ONLY a generic message + correlation ID. No stack
 *    traces, no e.message, no internal paths, no PHI.
 *  - Full forensic context is written to the secure logger, which
 *    masks PHI before shipping to Cloud Logging. Captured fields:
 *      * correlation ID, status, method, path, client IP
 *      * acting principal (once auth lands)
 *      * redacted headers, body, and query string
 *      * SHA-256 hash + byte length of the raw request body, so
 *        investigators can correlate identical payloads across
 *        requests without ever storing PHI in the log stream
 *      * full error name/message/stack
 *  - Honors err.status / err.statusCode when an upstream middleware
 *    sets one (e.g. 401 from auth), but still never exposes detail
 *    for 5xx.
 *
 * Must be registered LAST in index.js, after all routers.
 */

const GENERIC_5XX = 'Internal Server Error';
const GENERIC_4XX = 'Request could not be processed';

function hashBody(rawBody) {
    if (!rawBody || rawBody.length === 0) return null;
    return {
        sha256: crypto.createHash('sha256').update(rawBody).digest('hex'),
        bytes: rawBody.length,
    };
}

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
    const status =
        Number.isInteger(err.status) ? err.status
        : Number.isInteger(err.statusCode) ? err.statusCode
        : 500;

    // Forensic log — PHI is stripped by logger.redact before emission.
    // The bodyHash lets incident responders prove two requests carried
    // the same payload without the payload itself living in logs.
    logger.error('Unhandled request error', {
        requestId: req.id,
        status,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        principal: req.principal
            ? { id: req.principal.customerId, role: req.principal.role }
            : null,
        headers: req.headers,
        query: req.query,
        body: req.body,
        bodyHash: hashBody(req.rawBody),
        error: err,
    });

    if (res.headersSent) {
        // Cannot rewrite the response; let Express close the socket.
        return;
    }

    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const message = safeStatus >= 500 ? GENERIC_5XX : GENERIC_4XX;

    res.status(safeStatus).json({
        error: message,
        requestId: req.id,
    });
};

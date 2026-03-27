'use strict';

const crypto = require('crypto');

/**
 * Attach a per-request correlation ID.
 *
 * Prefers an upstream X-Request-Id header (set by Cloud LB / API
 * Gateway) when present and sane; otherwise generates a UUID v4 from
 * the Node stdlib. The ID is echoed back on the response so clients
 * can quote it when reporting issues, and it is attached to req.id so
 * the global error handler and logger can include it for forensic
 * correlation.
 */
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

module.exports = function requestId(req, res, next) {
    const incoming = req.get('X-Request-Id');
    const id = incoming && SAFE_ID.test(incoming)
        ? incoming
        : crypto.randomUUID();

    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
};

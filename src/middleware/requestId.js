/**
 * Request-id middleware.
 *
 * Assigns a server-generated UUID v4 to every incoming request and echoes
 * it back on the response as `X-Request-Id`. Inbound client-supplied
 * values are deliberately ignored to prevent log forging — a client
 * should not be able to influence the correlation id that ends up in the
 * audit trail.
 *
 * Satisfies T-P1-6 and D-P1-2 (request-id).
 */
const { v4: uuidv4 } = require('uuid');

function requestId(req, res, next) {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
}

module.exports = { requestId };

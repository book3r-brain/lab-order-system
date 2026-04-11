/**
 * Rate limiting middleware.
 *
 * Three tiers:
 *
 *   - `globalLimiter`: 60 req/min per IP across the whole app, the
 *     baseline cap called for in T-P1-7 and RL-01.
 *   - `strictLimiter`: 10 req/min for HEAD probes and DELETE calls — high
 *     blast radius operations should be harder to brute-force.
 *   - `webhookLimiter`: 120 req/min for Shopify webhook fan-in bursts
 *     where replay protection is already handled by HMAC + idempotency.
 *
 * The rate-limiter error path goes through the central error middleware
 * so the client never sees the default express-rate-limit plaintext.
 */
const rateLimit = require('express-rate-limit');

function makeLimiter({ max, windowMs = 60_000, name }) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler(req, res, next) {
            const err = new Error(`rate_limited:${name}`);
            err.statusCode = 429;
            err.code = 'rate_limited';
            next(err);
        },
    });
}

const globalLimiter = makeLimiter({ max: 60, name: 'global' });
const strictLimiter = makeLimiter({ max: 10, name: 'strict' });
const webhookLimiter = makeLimiter({ max: 120, name: 'webhook' });

module.exports = {
    globalLimiter,
    strictLimiter,
    webhookLimiter,
    makeLimiter,
};

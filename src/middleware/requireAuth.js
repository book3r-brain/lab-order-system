/**
 * JWT bearer authentication middleware.
 *
 * Validates `Authorization: Bearer <jwt>` headers against the
 * `JWT_SECRET`, `JWT_ISSUER`, and `JWT_AUDIENCE` values loaded from the
 * config module. On success, populates:
 *
 *   req.user = { id, role, customer_id, raw }
 *
 * On failure, emits an `auth.failure` audit event (without echoing the
 * offending token) and returns a generic 401 JSON envelope via the
 * central error middleware.
 *
 * The middleware never calls `res.status().send(e.message)` directly —
 * every failure mode goes through the error middleware so that the
 * response envelope is the single source of truth.
 *
 * Satisfies P1 items D-P1-5 (middleware) and supports T-P1-8, T-P1-9,
 * and T-P1-12.
 */
const jwt = require('jsonwebtoken');
const { audit } = require('../logger');

const BEARER_REGEX = /^Bearer\s+(.+)$/i;

function extractToken(req) {
    const header = req.get('authorization');
    if (!header) return null;
    const match = BEARER_REGEX.exec(header.trim());
    if (!match) return null;
    return match[1].trim();
}

function unauthenticated(req, reason) {
    audit.info({
        name: 'audit',
        event: 'auth.failure',
        outcome: 'failure',
        reason,
        request_id: req.id,
        src_ip: req.ip,
        user_agent: req.get('user-agent') || '',
        endpoint: req.originalUrl || req.url,
        method: req.method,
        actor_id: 'anonymous',
        actor_role: 'anonymous',
        resource_type: 'auth',
    });
    const err = new Error('unauthenticated');
    err.statusCode = 401;
    err.code = 'unauthenticated';
    return err;
}

function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return next(unauthenticated(req, 'missing_bearer_token'));
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
        });

        req.user = {
            id: payload.sub,
            role: payload.role || 'patient',
            customer_id: payload.customer_id,
            raw: payload,
        };

        audit.info({
            name: 'audit',
            event: 'auth.success',
            outcome: 'success',
            actor_id: req.user.id,
            actor_role: req.user.role,
            src_ip: req.ip,
            user_agent: req.get('user-agent') || '',
            endpoint: req.originalUrl || req.url,
            method: req.method,
            request_id: req.id,
            resource_type: 'auth',
        });

        return next();
    } catch (err) {
        const reason =
            err.name === 'TokenExpiredError'
                ? 'token_expired'
                : err.name === 'JsonWebTokenError'
                ? 'token_invalid'
                : 'token_rejected';
        return next(unauthenticated(req, reason));
    }
}

module.exports = { requireAuth, extractToken };

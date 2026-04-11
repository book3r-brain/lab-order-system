/**
 * Audit event emission middleware.
 *
 * Emits a single structured audit log entry for every PHI event on the
 * HTTP surface. Event shape conforms to T-P1-10:
 *
 *   {
 *     ts, request_id, actor_id, actor_role, src_ip, user_agent,
 *     endpoint, method, resource_type, resource_id, outcome, event
 *   }
 *
 * The middleware does not try to be clever about which routes touch PHI:
 * P1 applies it broadly to every authenticated router and lets the handler
 * contribute additional context (e.g. `resource_id`) as work progresses.
 *
 * Use:
 *   router.use(auditMiddleware('lab-order'));
 *
 * The handler can call `req.audit.success({resource_id: '...'})` or
 * `req.audit.failure({reason: '...'})` to explicitly finalize the event;
 * otherwise the middleware inspects the HTTP status code on `res.finish`
 * and emits `success` for 2xx and `failure` otherwise.
 */
const { audit } = require('../logger');

const METHOD_TO_EVENT = {
    GET: 'phi.read',
    HEAD: 'phi.read',
    POST: 'phi.create',
    PUT: 'phi.update',
    PATCH: 'phi.update',
    DELETE: 'phi.delete',
};

function methodToEvent(method) {
    return METHOD_TO_EVENT[method.toUpperCase()] || 'phi.access';
}

function auditMiddleware(resourceType) {
    return function auditEvent(req, res, next) {
        const base = {
            request_id: req.id,
            actor_id: (req.user && req.user.id) || 'anonymous',
            actor_role: (req.user && req.user.role) || 'anonymous',
            src_ip: req.ip,
            user_agent: req.get('user-agent') || '',
            endpoint: req.originalUrl || req.url,
            method: req.method,
            resource_type: resourceType,
            resource_id: null,
            event: methodToEvent(req.method),
        };

        let finalized = false;
        const finalize = (outcome, extra = {}) => {
            if (finalized) return;
            finalized = true;
            audit.info({
                ...base,
                ...extra,
                outcome,
            });
        };

        req.audit = {
            success(extra) {
                finalize('success', extra);
            },
            failure(extra) {
                finalize('failure', extra);
            },
            setResource(id) {
                base.resource_id = id;
            },
        };

        res.on('finish', () => {
            if (finalized) return;
            const outcome = res.statusCode >= 400 ? 'failure' : 'success';
            finalize(outcome);
        });

        next();
    };
}

module.exports = { auditMiddleware, methodToEvent };

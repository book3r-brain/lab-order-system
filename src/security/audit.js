function createConsoleAuditLogger() {
    return {
        log(event) {
            console.info(JSON.stringify(event));
        },
    };
}

function getAuditLogger(req) {
    return req.app.locals.auditLogger || createConsoleAuditLogger();
}

function getAuditEndpoint(req) {
    if (req.baseUrl && req.route && req.route.path) {
        return `${req.baseUrl}${req.route.path}`;
    }

    return req.path;
}

function logAuditEvent(req, details) {
    const logger = getAuditLogger(req);
    const event = {
        action: details.action,
        endpoint: getAuditEndpoint(req),
        ip: req.ip,
        requestId: req.requestId,
        resourceId: String(details.resourceId || 'unknown'),
        success: Boolean(details.success),
        timestamp: (req.app.locals.clock ? req.app.locals.clock() : new Date()).toISOString(),
        user: details.user || (req.actor && req.actor.id) || 'anonymous',
    };

    if (typeof logger.log === 'function') {
        logger.log(event);
    } else if (typeof logger === 'function') {
        logger(event);
    }

    return event;
}

module.exports = {
    createConsoleAuditLogger,
    logAuditEvent,
};

const { sendError } = require('./http');

const PRIVILEGED_ROLES = new Set(['admin', 'service']);

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function isPrivileged(req) {
    return PRIVILEGED_ROLES.has((req.actor && req.actor.role) || '');
}

function requireAuthenticated(req, res, next) {
    if (req.actor && req.actor.id && req.actor.role) {
        return next();
    }

    return sendError(res, 401, 'Authentication required');
}

function canAccessCustomerId(req, customerId) {
    if (isPrivileged(req)) {
        return true;
    }

    return Boolean(req.actor && req.actor.customerId && String(req.actor.customerId) === String(customerId));
}

function canAccessEmail(req, email) {
    if (isPrivileged(req)) {
        return true;
    }

    return normalizeEmail(req.actor && req.actor.email) === normalizeEmail(email);
}

module.exports = {
    canAccessCustomerId,
    canAccessEmail,
    isPrivileged,
    normalizeEmail,
    requireAuthenticated,
};

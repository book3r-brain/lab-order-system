function createRequestId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function attachRequestContext(req, res, next) {
    req.actor = {
        customerId: req.get('x-customer-id') || null,
        email: req.get('x-actor-email') || null,
        id: req.get('x-actor-id') || null,
        role: req.get('x-actor-role') || null,
    };
    req.requestId = req.get('x-request-id') || createRequestId();

    next();
}

module.exports = {
    attachRequestContext,
};

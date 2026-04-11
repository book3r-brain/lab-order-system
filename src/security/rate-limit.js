const { sendError } = require('./http');

function createRateLimiter(options) {
    const {
        keyFn = (req) => (req.actor && req.actor.id) || req.ip,
        max = 3,
        name,
        windowMs = 60 * 1000,
    } = options;

    return (req, res, next) => {
        const appStore = req.app.locals.rateLimitStore;
        const routeKey = `rate-limit:${name}`;
        const now = Date.now();
        const routeConfig = (req.app.locals.rateLimitConfig && req.app.locals.rateLimitConfig[name]) || {};
        const effectiveMax = routeConfig.max || max;
        const effectiveWindowMs = routeConfig.windowMs || windowMs;

        if (!appStore.has(routeKey)) {
            appStore.set(routeKey, new Map());
        }

        const routeStore = appStore.get(routeKey);
        const key = keyFn(req);
        const history = (routeStore.get(key) || []).filter((timestamp) => now - timestamp < effectiveWindowMs);

        if (history.length >= effectiveMax) {
            return sendError(res, 429, 'Too many requests');
        }

        history.push(now);
        routeStore.set(key, history);

        return next();
    };
}

module.exports = {
    createRateLimiter,
};

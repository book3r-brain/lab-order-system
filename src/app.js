/**
 * Express application factory.
 *
 * This module exports a factory function (`createApp`) that returns a
 * fully wired Express app **without** binding to a port. The production
 * entrypoint `src/index.js` calls `createApp()` and then `.listen()`;
 * tests call `createApp()` directly via `supertest`, which means the
 * app can be instantiated many times per test run without colliding on
 * a network socket.
 *
 * Middleware pipeline (outermost first):
 *
 *   1.  `trust proxy` — honor the API gateway's X-Forwarded-For header
 *       so that rate limiting and audit logging attribute the real
 *       client IP, not the load balancer.
 *   2.  `helmet` hardening headers (HSTS, nosniff, DENY, hide x-powered-by).
 *   3.  CORS allow-list.
 *   4.  Server-generated request id.
 *   5.  pino-http access logging, correlated by request id.
 *   6.  Strict JSON body parser with a 64 KB cap and 415 enforcement.
 *   7.  Global rate limiter.
 *   8.  Per-resource route routers, each of which is preceded by
 *       `requireAuth` unless the route is explicitly unauthenticated
 *       (webhook ingestion and the welcome page).
 *   9.  404 handler.
 *  10.  Central error middleware — the single place a JSON error
 *       envelope can leave the process.
 *
 * Satisfies P1 items D-P1-1, D-P1-2, D-P1-3, D-P1-4, and D-P1-6.
 */
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const { loadConfig } = require('./config');
const { logger } = require('./logger');
const { requestId } = require('./middleware/requestId');
const { requireAuth } = require('./middleware/requireAuth');
const { auditMiddleware } = require('./middleware/audit');
const {
    globalLimiter,
    strictLimiter,
    webhookLimiter,
} = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
    // Boot-time config validation. Throws on missing required env.
    const config = loadConfig();

    const app = express();

    // --- 1. Runtime hardening ------------------------------------------
    app.disable('x-powered-by');
    app.set('trust proxy', 1);

    // --- 2. Helmet security headers ------------------------------------
    app.use(
        helmet({
            hsts: {
                maxAge: 31_536_000,
                includeSubDomains: true,
                preload: true,
            },
            // The welcome page is static HTML with no scripts; allow
            // baseline CSP and tighten in P3 once assets are stable.
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    frameAncestors: ["'none'"],
                },
            },
            crossOriginResourcePolicy: { policy: 'same-origin' },
            referrerPolicy: { policy: 'no-referrer' },
        })
    );

    // --- 3. CORS allow-list --------------------------------------------
    const allowed = (config.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    app.use(
        cors({
            origin(origin, cb) {
                if (!origin || allowed.length === 0) return cb(null, false);
                return cb(null, allowed.includes(origin));
            },
            credentials: false,
        })
    );

    // --- 4. Server-generated request id --------------------------------
    app.use(requestId);

    // --- 5. HTTP access logging correlated by request id --------------
    app.use(
        pinoHttp({
            logger,
            genReqId: (req) => req.id,
            autoLogging: {
                ignore: (req) => req.url === '/',
            },
            customProps(req) {
                return { request_id: req.id };
            },
            serializers: {
                req(req) {
                    return {
                        id: req.id,
                        method: req.method,
                        url: req.url,
                        remoteAddress: req.remoteAddress,
                    };
                },
                res(res) {
                    return { statusCode: res.statusCode };
                },
            },
        })
    );

    // --- 6. Body parsing -----------------------------------------------
    // strict:true rejects non-JSON payloads with a 415; type:'application/json'
    // only parses exact-match content types; limit:'64kb' enforces T-P1-3.
    app.use(
        bodyParser.json({
            limit: '64kb',
            strict: true,
            type: 'application/json',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        })
    );

    // Content-type guard: for POST/PUT/PATCH that carry a body we require
    // application/json. Body-parser skips non-JSON content silently, which
    // lets an attacker reach handlers with `req.body === {}`. We enforce
    // the 415 explicitly here.
    app.use((req, res, next) => {
        if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
        const ct = req.get('content-type') || '';
        // Webhook routes use application/json but Shopify may append a
        // charset; allow any application/json variant.
        if (!/^application\/json/i.test(ct)) {
            const err = new Error('unsupported_media_type');
            err.statusCode = 415;
            err.code = 'unsupported_media_type';
            return next(err);
        }
        return next();
    });

    // --- 7. Rate limiting ---------------------------------------------
    //
    // Strict limiter runs BEFORE the routers for HEAD and DELETE so the
    // cap is enforced before the handler can respond. The global limiter
    // wraps everything else.
    app.use((req, res, next) => {
        if (req.method === 'HEAD' || req.method === 'DELETE') {
            return strictLimiter(req, res, next);
        }
        return globalLimiter(req, res, next);
    });

    // --- 8. Routers ----------------------------------------------------
    const testKitRoutes = require('./routes/test-kit-orders');
    const labOrderRoutes = require('./routes/lab-orders');
    const orderRoutes = require('./routes/orders');
    const customerRoutes = require('./routes/customers');
    const shopifyOrderRoutes = require('./routes/shopfiy-orders');
    const webhookRoutes = require('./routes/webhooks');

    // Authenticated routes: requireAuth + audit middleware per resource type.
    app.use(
        '/lab-orders',
        requireAuth,
        auditMiddleware('lab-order'),
        labOrderRoutes
    );
    app.use(
        '/test-kit-orders',
        requireAuth,
        auditMiddleware('test-kit-order'),
        testKitRoutes
    );
    app.use(
        '/orders',
        requireAuth,
        auditMiddleware('shopify-order-cache'),
        orderRoutes
    );
    app.use(
        '/customers',
        requireAuth,
        auditMiddleware('shopify-customer-cache'),
        customerRoutes
    );
    app.use(
        '/shopify-orders',
        requireAuth,
        auditMiddleware('shopify-admin-proxy'),
        shopifyOrderRoutes
    );

    // Webhook ingestion — HMAC-authenticated, no JWT middleware.
    app.use('/webhooks', webhookLimiter, webhookRoutes);

    // Swagger / welcome — gated behind auth in P4, kept public for now
    // to preserve developer workflow. The welcome page is static HTML.
    const swaggerDocument = YAML.load(
        path.join(__dirname, '../doc/swagger/swagger-latest.yaml')
    );
    if (process.env.NODE_ENV !== 'production') {
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '/public/welcome.html'));
    });

    // --- 9. 404 handler ------------------------------------------------
    app.use(notFoundHandler);

    // --- 10. Central error envelope ------------------------------------
    app.use(errorHandler);

    return app;
}

module.exports = createApp;

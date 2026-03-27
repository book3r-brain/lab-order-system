'use strict';

// Load .env only outside production. In deployed environments secrets
// come from Google Cloud Secret Manager / runtime env, never from a
// file baked into the image.
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const logger = require('./logger');
const requestId = require('./middleware/request-id');
const errorHandler = require('./middleware/error-handler');

const app = express();

// Running behind Cloud Run / GCLB — trust the first proxy hop so
// req.ip reflects the real client address for audit logging.
app.set('trust proxy', 1);

// Suppress Express's default X-Powered-By header (minor info leak).
app.disable('x-powered-by');

const swaggerDocument = YAML.load(
    path.join(__dirname, '../doc/swagger/swagger-latest.yaml')
);

const testKitRoutes = require('./routes/test-kit-orders');
const labOrderRoutes = require('./routes/lab-orders');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const shopifyOrderRoutes = require('./routes/shopfiy-orders');
const webhookRoutes = require('./routes/webhooks');

// ---------------------------------------------------------------------------
// Global pre-routing middleware
// ---------------------------------------------------------------------------

// Standardized middleware order (do not reorder without review):
//   1. requestId    — runs before anything that can throw, so every
//                     error log and client response carries a
//                     correlation ID, including JSON parse failures.
//   2. express.json — parses body and captures the raw bytes for
//                     webhook HMAC verification. Size-capped to
//                     mitigate memory-exhaustion DoS.
//   3. routers
//   4. errorHandler — terminal; masks internals, logs forensics.
app.use(requestId);

app.use(express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    },
}));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/test-kit-orders', testKitRoutes);
app.use('/lab-orders', labOrderRoutes);
app.use('/orders', orderRoutes);
app.use('/customers', customerRoutes);
app.use('/shopify-orders', shopifyOrderRoutes);
app.use('/webhooks', webhookRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/welcome.html'));
});

// ---------------------------------------------------------------------------
// Terminal error handler — MUST be last.
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Process-level safety nets. Log and exit so the orchestrator restarts
// us into a clean state rather than continuing in an undefined one.
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
    logger.critical('Unhandled promise rejection', { error: reason });
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.critical('Uncaught exception', { error: err });
    process.exit(1);
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
    logger.info('Server listening', { port, env: app.get('env') });
});

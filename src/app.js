const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const defaultDb = require('./database');
const { createConsoleAuditLogger } = require('./security/audit');
const { attachRequestContext } = require('./security/request-context');

const testKitRoutes = require('./routes/test-kit-orders');
const labOrderRoutes = require('./routes/lab-orders');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const shopifyOrderRoutes = require('./routes/shopfiy-orders');
const webhookRoutes = require('./routes/webhooks');

const swaggerDocument = YAML.load(path.join(__dirname, '../doc/swagger/swagger-latest.yaml'));

function createApp(options = {}) {
    const app = express();

    app.set('trust proxy', true);

    app.locals.db = options.db || defaultDb;
    app.locals.auditLogger = options.auditLogger || createConsoleAuditLogger();
    app.locals.clock = options.clock || (() => new Date());
    app.locals.fetchImpl = options.fetchImpl || global.fetch;
    app.locals.rateLimitConfig = options.rateLimitConfig || {};
    app.locals.rateLimitStore = new Map();

    if (options.publishLabOrderMessage) {
        app.locals.publishLabOrderMessage = options.publishLabOrderMessage;
    }

    if (options.publishTestKitMessage) {
        app.locals.publishTestKitMessage = options.publishTestKitMessage;
    }

    app.use(bodyParser.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    }));

    app.use(attachRequestContext);

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

    return app;
}

module.exports = {
    createApp,
};

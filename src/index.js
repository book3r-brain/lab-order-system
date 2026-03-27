require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const secureLogger = require('./services/secure-logger');
const errorHandler = require('./middleware/error-handler');
const requireActor = require('./middleware/require-actor');

const path = require('path');

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, '../doc/swagger/swagger-latest.yaml'));

const testKitRoutes = require('./routes/test-kit-orders');
const labOrderRoutes = require('./routes/lab-orders');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const shopifyOrderRoutes = require('./routes/shopfiy-orders');
const webhookRoutes = require('./routes/webhooks');

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = Buffer.from(buf);
    }
}));

app.use(express.urlencoded({
    extended: false,
}));

app.use('/test-kit-orders', testKitRoutes);

app.use('/lab-orders', requireActor, labOrderRoutes);

app.use('/orders', orderRoutes);

app.use('/customers', customerRoutes);

app.use('/shopify-orders', shopifyOrderRoutes);

app.use('/webhooks', webhookRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/welcome.html'));
});

app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    secureLogger.logError(error, null, { source: 'unhandledRejection' });
});

process.on('uncaughtException', (error) => {
    secureLogger.logError(error, null, { source: 'uncaughtException' })
        .finally(() => {
            process.exit(1);
        });
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log('Listening on port ', port, app.get('env'));
});

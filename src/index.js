require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const path = require('path');

const app = express();

const swaggerDocument = YAML.load(path.join(__dirname, '../doc/swagger/swagger-latest.yaml'));

const testKitRoutes = require('./routes/test-kit-orders');
const labOrderRoutes = require('./routes/lab-orders');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const shopifyOrderRoutes = require('./routes/shopfiy-orders');
const webhookRoutes = require('./routes/webhooks');

app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use('/test-kit-orders', testKitRoutes);

app.use('/lab-orders', labOrderRoutes);

app.use('/orders', orderRoutes);

app.use('/customers', customerRoutes);

app.use('/shopify-orders', shopifyOrderRoutes);

app.use('/webhooks', webhookRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/welcome.html'));
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log('Listening on port ', port, app.get('env'));
});
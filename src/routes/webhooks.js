const express = require('express');
const crypto = require('crypto');

const defaultDb = require('../database.js');
const { logAuditEvent } = require('../security/audit');
const { handleRouteError } = require('../security/http');
const { assertValidEmail, assertValidId } = require('../security/validation');

const router = express.Router();

const verifyShopifyWebhook = (req, res, next) => {
    try {
        const hmac = req.get('X-Shopify-Hmac-Sha256');

        const hash = crypto
            .createHmac('sha256', process.env.SHOPIFY_API_WEBHOOK || '')
            .update(req.rawBody || '', 'utf8', 'hex')
            .digest('base64');

        if (hash === hmac) {
            next();
        } else {
            res.sendStatus(403);
        }
    } catch (error) {
        res.sendStatus(500);
    }
};

router.verifyShopifyWebhook = verifyShopifyWebhook;

// router.use(verifyShopifyWebhook);

router.post('/orders/create', async (req, res) => {
    try {
        const orderData = sanitizeWebhookOrder(req.body);

        await getDb(req).collection('orders').doc(String(orderData.id)).set(orderData);

        logAuditEvent(req, {
            action: 'webhook.order.ingest',
            resourceId: orderData.id,
            success: true,
            user: 'shopify-webhook',
        });

        return res.status(200).send('Webhook processed successfully');
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.post('/customers/create', async (req, res) => {
    try {
        const customerData = sanitizeWebhookCustomer(req.body);

        await getDb(req).collection('customers').doc(String(customerData.id)).set(customerData);

        logAuditEvent(req, {
            action: 'webhook.customer.ingest',
            resourceId: customerData.id,
            success: true,
            user: 'shopify-webhook',
        });

        return res.status(200).send('Webhook processed successfully');
    } catch (error) {
        return handleRouteError(res, error);
    }
});

module.exports = router;

function getDb(req) {
    return req.app.locals.db || defaultDb;
}

function sanitizeWebhookOrder(payload) {
    assertValidId(payload.id, 'order-id', { required: true });
    assertValidEmail(payload.email, 'email');

    return {
        id: payload.id,
        email: payload.email,
        created_at: payload.created_at,
        currency: payload.currency,
        financial_status: payload.financial_status,
        line_items: payload.line_items,
        shipping_address: payload.shipping_address,
        total_price: payload.total_price,
    };
}

function sanitizeWebhookCustomer(payload) {
    assertValidId(payload.id, 'customer-id', { required: true });
    assertValidEmail(payload.email, 'email');

    return {
        id: payload.id,
        email: payload.email,
        firstName: payload.firstName || payload.first_name,
        lastName: payload.lastName || payload.last_name,
        phone: payload.phone,
    };
}

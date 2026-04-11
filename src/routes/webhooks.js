const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database.js');
const { logger, audit } = require('../logger');

// Middleware to verify Shopify Webhooks
const verifyShopifyWebhook = (req, res, next) => {
    try {
        const provided = req.get('X-Shopify-Hmac-Sha256');
        if (!provided) {
            audit.info(
                {
                    event: 'webhook.rejected',
                    outcome: 'failure',
                    reason: 'missing_hmac_header',
                    request_id: req.id,
                    src_ip: req.ip,
                    endpoint: req.originalUrl || req.url,
                    method: req.method,
                    resource_type: 'shopify-webhook',
                },
                'webhook_missing_hmac'
            );
            const err = new Error('webhook_missing_hmac');
            err.statusCode = 401;
            err.code = 'webhook_missing_hmac';
            return next(err);
        }

        const expected = crypto
            .createHmac('sha256', process.env.SHOPIFY_API_WEBHOOK)
            .update(req.rawBody || Buffer.alloc(0))
            .digest();
        const given = Buffer.from(provided, 'base64');

        if (
            expected.length !== given.length ||
            !crypto.timingSafeEqual(expected, given)
        ) {
            audit.info(
                {
                    event: 'webhook.rejected',
                    outcome: 'failure',
                    reason: 'hmac_mismatch',
                    request_id: req.id,
                    src_ip: req.ip,
                    endpoint: req.originalUrl || req.url,
                    method: req.method,
                    resource_type: 'shopify-webhook',
                },
                'webhook_hmac_mismatch'
            );
            const err = new Error('webhook_forbidden');
            err.statusCode = 403;
            err.code = 'webhook_forbidden';
            return next(err);
        }

        audit.info(
            {
                event: 'webhook.verified',
                outcome: 'success',
                request_id: req.id,
                src_ip: req.ip,
                endpoint: req.originalUrl || req.url,
                method: req.method,
                resource_type: 'shopify-webhook',
            },
            'webhook_verified'
        );
        return next();
    } catch (e) {
        return next(e);
    }
};

router.use(verifyShopifyWebhook);

router.post('/orders/create', async (req, res, next) => {
    try {
        const orderData = req.body;
        const orderId = orderData && orderData.id;
        if (orderId === undefined || orderId === null) {
            const err = new Error('missing_order_id');
            err.statusCode = 400;
            err.code = 'missing_order_id';
            return next(err);
        }

        await db.collection('orders').doc(String(orderId)).set(orderData);
        logger.info({ request_id: req.id, order_id: orderId }, 'webhook_order_saved');
        return res.status(200).json({ ok: true, request_id: req.id });
    } catch (e) {
        return next(e);
    }
});

router.post('/customers/create', async (req, res, next) => {
    try {
        const customerData = req.body;
        const customerId = customerData && customerData.id;
        if (customerId === undefined || customerId === null) {
            const err = new Error('missing_customer_id');
            err.statusCode = 400;
            err.code = 'missing_customer_id';
            return next(err);
        }

        await db
            .collection('customers')
            .doc(String(customerId))
            .set(customerData);
        logger.info(
            { request_id: req.id, customer_id: customerId },
            'webhook_customer_saved'
        );
        return res.status(200).json({ ok: true, request_id: req.id });
    } catch (e) {
        return next(e);
    }
});

module.exports = router;

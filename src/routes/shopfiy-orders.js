const express = require('express');
const router = express.Router();
const { logger } = require('../logger');

const getShopifyToken = async (req, res, next) => {
    try {
        const resp = await fetch(
            `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/oauth/access_token`,
            {
                method: 'post',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: process.env.SHOPIFY_CLIENT_ID,
                    client_secret: process.env.SHOPIFY_CLIENT_SECRET,
                }),
            }
        );
        if (!resp.ok) {
            logger.error(
                { request_id: req.id, status: resp.status },
                'shopify_token_fetch_failed'
            );
            const err = new Error('shopify_token_failed');
            err.statusCode = 502;
            err.code = 'upstream_error';
            return next(err);
        }
        const data = await resp.json();
        req.shopifyToken = data.access_token;
        next();
    } catch (e) {
        next(e);
    }
};

// NOTE: This endpoint is slated for removal in P0 (D-P0-1). For P1, it is
// now at least gated behind requireAuth so anonymous callers cannot pull a
// Shopify Admin token, but the real fix is to delete the route entirely.
router.get('/token', getShopifyToken, (req, res) => {
    res.json({ access_token: req.shopifyToken });
});

// Get specific shopify Order
router.get('/:id', getShopifyToken, async (req, res, next) => {
    try {
        const orderID = req.params.id;
        req.audit && req.audit.setResource(orderID);
        const shopifyURL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2026-01/orders/${orderID}.json`;

        const shopResponse = await fetch(shopifyURL, {
            headers: {
                'X-Shopify-Access-Token': req.shopifyToken,
                'Content-Type': 'application/json',
            },
        });

        if (!shopResponse.ok) {
            const err = new Error('shopify_upstream_error');
            err.statusCode = 502;
            err.code = 'upstream_error';
            return next(err);
        }

        const data = await shopResponse.json();
        res.status(200).json(data);
    } catch (e) {
        next(e);
    }
});

// Update specific shopify Order
router.post('/:id', getShopifyToken, async (req, res, next) => {
    try {
        const orderID = req.params.id;
        req.audit && req.audit.setResource(orderID);
        const shopifyURL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2026-01/orders/${orderID}.json`;

        const payload = {
            order: {
                id: orderID,
                metafields: [
                    {
                        'kit-id': req.body['kit-id'],
                        'tesk-kit-order-id': req.body['order-id'],
                        'order-date': req.body['order-date'],
                        'current-status': req.body['current-status'],
                        'processing-status': req.body['processing-status'],
                    },
                ],
            },
        };

        const shopResponse = await fetch(shopifyURL, {
            method: 'PUT',
            headers: {
                'X-Shopify-Access-Token': req.shopifyToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!shopResponse.ok) {
            const err = new Error('shopify_upstream_error');
            err.statusCode = 502;
            err.code = 'upstream_error';
            return next(err);
        }

        const data = await shopResponse.json();
        res.status(200).json(data);
    } catch (e) {
        next(e);
    }
});

module.exports = router;

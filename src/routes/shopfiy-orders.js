const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');

const getShopifyToken = async (req, res, next) => {
    try {
        const resp = await fetch(`https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/oauth/access_token`, {
            method: "post",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: process.env.SHOPIFY_CLIENT_ID,
                client_secret: process.env.SHOPIFY_CLIENT_SECRET,
            }),
        });
        const text = await resp.text();
        if (!resp.ok) {
            const error = new Error('Shopify token request failed.');
            error.status = 502;
            error.code = 'SHOPIFY_TOKEN_REQUEST_FAILED';
            error.context = {
                status: resp.status,
                responseBody: text,
            };
            return next(error);
        }
        const data = JSON.parse(text);
        req.shopifyToken = data.access_token;
        next();
    } catch (error) {
        next(error);
    }
};

/********************************** Shopify Info Retrieval *************************************************************************/

// Get specific shopify Order
router.get('/:id', getShopifyToken, asyncHandler(async (req, res) => {
    const orderID = req.params.id;
    const shopifyURL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2026-01/orders/${orderID}.json`;

    console.log('Shopify Order for ' + shopifyURL);
    let shopResponse = await fetch(shopifyURL, {
        headers: {
            'X-Shopify-Access-Token': req.shopifyToken,
            'Content-Type': 'application/json'
        }
    });

    if (!shopResponse.ok) {
        throw new Error(`Shopify API error: ${shopResponse.statusText}`);
    }

    let data = await shopResponse.json();

    res.status(200).json(data);
}));

// Update specific shopify Order
router.post('/:id', getShopifyToken, asyncHandler(async (req, res) => {
    const orderID = req.params.id;
    const shopifyURL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2026-01/orders/${orderID}.json`;

    console.log('Update Shopify Order ' + shopifyURL);

    const payload = {
        order: {
            id: orderID,
            metafields: [
                {
                    'kit-id': req.body['kit-id'],
                    'tesk-kit-order-id': req.body['order-id'],
                    'order-date': req.body['order-date'],
                    'current-status': req.body['current-status'],
                    'processing-status': req.body['processing-status']
                }
            ]
        }
    };

    let shopResponse = await fetch(shopifyURL, {
        method: 'PUT',
        headers: {
            'X-Shopify-Access-Token': req.shopifyToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!shopResponse.ok) {
        throw new Error(`Shopify API error: ${shopResponse.statusText}`);
    }

    let data = await shopResponse.json();

    res.status(200).json(data);
}));

module.exports = router

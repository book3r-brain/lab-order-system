const express = require('express');
const router = express.Router();

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
            console.error("Token request failed:", resp.status, text);
            return res.status(500).send("Token request failed");
        }
        const data = JSON.parse(text);
        req.shopifyToken = data.access_token;
        next();
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

router.get("/token", getShopifyToken, (req, res) => {
    res.json({ access_token: req.shopifyToken });
});

/********************************** Shopify Info Retrieval *************************************************************************/

// Get specific shopify Order
router.get('/:id', getShopifyToken, async (req, res) => {
    try {
        const orderID = req.params.id;
        const shopifyURL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2026-01/orders/${orderID}.json`;

        console.log("Shopify Order for " + shopifyURL);
        let shopResponse = await fetch(shopifyURL, {
            headers: {
                "X-Shopify-Access-Token": req.shopifyToken,
                "Content-Type": "application/json"
            }
        });

        if (!shopResponse.ok) {
            throw new Error(`Shopify API error: ${shopResponse.statusText}`);
        }

        let data = await shopResponse.json();


        res.status(200).json(data);
    } catch (e) {
        console.error("NOTCH ERROR", e.message);
        res.status(417).json({ "ERROR": e.message });
    }

});

// Update specific shopify Order
router.post('/:id', getShopifyToken, async (req, res) => {
    try {
        const orderID = req.params.id;
        const shopifyURL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2026-01/orders/${orderID}.json`;

        console.log("Update Shopify Order " + shopifyURL);

        const payload = {
            "order": {
                "id": orderID,
                "metafields": [
                    {
                        "kit-id": req.body["kit-id"],
                        "tesk-kit-order-id": req.body["order-id"],
                        "order-date": req.body["order-date"],
                        "current-status": req.body["current-status"],
                        "processing-status": req.body["processing-status"]
                    }
                ]
            }
        }

        let shopResponse = await fetch(shopifyURL, {
            method: 'PUT',
            headers: {
                "X-Shopify-Access-Token": req.shopifyToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!shopResponse.ok) {
            throw new Error(`Shopify API error: ${shopResponse.statusText}`);
        }

        let data = await shopResponse.json();

        res.status(200).json(data);
    } catch (e) {
        console.error("NOTCH ERROR", e.message);
        res.status(417).json({ "ERROR": e.message });
    }
});

module.exports = router
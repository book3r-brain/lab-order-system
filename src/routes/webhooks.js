const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database.js');

// Middleware to verify Shopify Webhooks
const verifyShopifyWebhook = (req, res, next) => {
    try {
        const hmac = req.get('X-Shopify-Hmac-Sha256');

        // Create a hash using the raw body and our key
        const hash = crypto
            .createHmac('sha256', process.env.SHOPIFY_API_WEBHOOK || '')
            .update(req.rawBody || '', 'utf8', 'hex')
            .digest('base64');

        // Compare our hash to Shopify's hash
        if (hash === hmac) {
            console.log('Webhook verified: Came from Shopify!');
            next();
        } else {
            console.log('Danger! Webhook not from Shopify!');
            res.sendStatus(403);
        }
    } catch (e) {
        console.error("Webhook Verification Error:", e.message);
        res.sendStatus(500);
    }
};

// If you want to test webhooks locally without signature validation, 
// you can comment out the middleware here, but it should be left on for production!
// router.use(verifyShopifyWebhook);

router.post('/orders/create', async (req, res) => {
    console.log('🎉 We got an order via webhook!');
    try {
        const orderData = req.body;
        const orderId = orderData.id;

        // Example: Save the order to DB
        await db.collection('orders').doc(String(orderId)).set(orderData);
        
        console.log(`Saved order ${orderId} to database.`);
        res.status(200).send('Webhook processed successfully');
    } catch (e) {
        console.error("Webhook Order Create Error", e.message);
        res.status(500).send(e.message);
    }
});

router.post('/customer', async (req, res) => {
    console.log('🎉 We got a customer creation via webhook!');
    try {
        const customerData = req.body;
        const customerId = customerData.id;

        // Save the customer to DB
        await db.collection('customers').doc(String(customerId)).set(customerData);
        
        console.log(`Saved customer ${customerId} to database.`);
        res.status(200).send('Webhook processed successfully');
    } catch (e) {
        console.error("Webhook Customer Create Error", e.message);
        res.status(500).send(e.message);
    }
});

module.exports = router;
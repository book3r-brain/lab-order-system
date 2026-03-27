const express = require('express');
const router = express.Router();
const db = require('../database.js');
const asyncHandler = require('../middleware/async-handler');
const verifyShopifyWebhook = require('../middleware/verify-shopify-webhook');
const webhookIdempotency = require('../middleware/webhook-idempotency');
const webhookIdempotencyRepository = require('../repositories/webhook-idempotency-repository');

router.use(verifyShopifyWebhook);
router.use(asyncHandler(webhookIdempotency));

router.post('/orders/create', asyncHandler(async (req, res) => {
    console.log('🎉 We got an order via webhook!');
    const orderData = req.body;
    const orderId = orderData.id;

    const batch = db.batch();
    batch.set(db.collection('orders').doc(String(orderId)), orderData);
    batch.set(
        req.webhookReceipt.receiptRef,
        webhookIdempotencyRepository.buildCompletedRecord({
            resource: 'order',
            resourceId: String(orderId),
        }),
        { merge: true }
    );
    await batch.commit();
    req.webhookReceipt.completed = true;

    console.log(`Saved order ${orderId} to database.`);
    res.status(200).send('Webhook processed successfully');
}));

router.post('/customer', asyncHandler(async (req, res) => {
    console.log('🎉 We got a customer creation via webhook!');
    const customerData = req.body;
    const customerId = customerData.id;

    const batch = db.batch();
    batch.set(db.collection('customers').doc(String(customerId)), customerData);
    batch.set(
        req.webhookReceipt.receiptRef,
        webhookIdempotencyRepository.buildCompletedRecord({
            resource: 'customer',
            resourceId: String(customerId),
        }),
        { merge: true }
    );
    await batch.commit();
    req.webhookReceipt.completed = true;

    console.log(`Saved customer ${customerId} to database.`);
    res.status(200).send('Webhook processed successfully');
}));

module.exports = router;

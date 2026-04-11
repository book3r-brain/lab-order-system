const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { logger } = require('../logger');

const { PubSub } = require('@google-cloud/pubsub');
const pubsubRepository = require('../repositories/pub-sub-repo');

const pubSubClient = new PubSub();
const { publishMessage } = pubsubRepository;
const topicName = 'test_kit_topic';

/********************************** Test Kits *************************************************************************/

// Get the tracking information based on test kit id
router.get('/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        req.audit && req.audit.setResource(String(id));
        logger.info({ request_id: req.id }, 'test_kit_read');

        const query = db.collection('test-kit-orders').where('order-id', '==', id);
        const snap = await query.get();

        if (snap.size > 0) {
            const collection = {};
            snap.forEach((doc) => {
                collection[doc.id] = doc.data();
            });
            return res.status(200).json(collection);
        }
        return res.status(404).json({ error: 'not_found', request_id: req.id });
    } catch (e) {
        return next(e);
    }
});

// Update Test Kit
router.post('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        req.audit && req.audit.setResource(id);

        const data = extractTestKitDataFromRequest(req, id);
        const messageId = await publishMessage(pubSubClient, topicName, data);

        const kitRef = db.collection('test-kit-orders').doc(id);
        await kitRef.update({ 'kit-id': data });

        res.status(200).json({
            action: 'TEST KIT ORDER UPDATE',
            success: true,
            message_id: messageId,
        });
    } catch (e) {
        next(e);
    }
});

// Create a test kit for patient/customer/practitioner.
router.post('/', async (req, res, next) => {
    try {
        const orderID = req.body['order-id'];
        const data = extractTestKitDataFromRequest(req, orderID);

        const messageId = await publishMessage(pubSubClient, topicName, data);
        req.audit && req.audit.setResource(orderID);
        logger.info({ request_id: req.id }, 'test_kit_create');

        await db.collection('test-kit-orders').doc(orderID).set(data);

        res.status(201).json({
            action: 'TEST KIT ORDER CREATE',
            success: true,
            message_id: messageId,
        });
    } catch (e) {
        next(e);
    }
});

// Delete the test kit order for a customer/practitioner
router.delete('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        req.audit && req.audit.setResource(id);
        logger.warn({ request_id: req.id }, 'test_kit_delete');

        await db.collection('test-kit-orders').doc(id).delete();
        res.status(204).end();
    } catch (e) {
        next(e);
    }
});

module.exports = router;

function extractTestKitDataFromRequest(req, id) {
    return {
        'order-id': req.body['order-id'],
        'customer-id': req.body['customer-id'],
        'pract-id': process.env.CLINIC_PRACT_ID,
        'order-taker': process.env.ORDER_TAKER,
        requester: process.env.NAME_OF_REQUESTOR + id,
        'process-type': req.body['process-type'],
        'loc-pos': req.body['loc-pos'],
        'clinic-name': req.body['clinic-name'],
        address1: req.body['address1'],
        address2: req.body['address2'],
        city: req.body['city'],
        state: req.body['state'],
        zip: req.body['zip'],
        country: req.body['country'],
        'req-loc': process.env.REQ_LOC,
        'shipping-method': req.body['shipping-method'],
        'tracking-num': req.body['tracking-num'],
        'processing-status': process.env.STATUS,
        status: req.body['status'],
        comment: req.body['comment'],
        'kit-id': req.body['kit-id'],
    };
}

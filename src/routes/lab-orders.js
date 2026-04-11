const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { logger } = require('../logger');

const { PubSub } = require('@google-cloud/pubsub');
const pubsubRepository = require('../repositories/pub-sub-repo');

const pubSubClient = new PubSub();
const { publishMessage } = pubsubRepository;
const topicName = 'lab_order_topic';

/********************************** Lab Order *************************************************************************/

// Create lab order information for customer.
router.post('/', async (req, res, next) => {
    try {
        const orderID = req.body['order-id'];
        const data = extractLabOrderData(req);

        const messageId = await publishMessage(pubSubClient, topicName, data);
        logger.info({ request_id: req.id }, 'lab_order_create');

        await db.collection('lab-orders').doc(orderID).set(data);
        req.audit && req.audit.setResource(orderID);

        res.status(201).json({
            action: 'LAB ORDER CREATE',
            success: true,
            message_id: messageId,
        });
    } catch (e) {
        next(e);
    }
});

// Get all lab orders for customer
router.get('/', async (req, res, next) => {
    try {
        // P2 work replaces this with req.user.customer_id; for P1 we still
        // pull from the body for backwards compatibility but the request
        // is at least authenticated.
        const id = (req.body && req.body['customer-id']) || (req.user && req.user.customer_id);
        logger.info({ request_id: req.id }, 'lab_order_list');

        const labOrderRef = db.collection('lab-orders');
        const snapshot = await labOrderRef.where('customer-id', '==', id).get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'not_found', request_id: req.id });
        }

        const collection = {};
        snapshot.forEach((doc) => {
            collection[doc.id] = doc.data();
        });
        return res.status(200).json(collection);
    } catch (e) {
        return next(e);
    }
});

// Get a specified lab order
router.get('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        logger.info({ request_id: req.id }, 'lab_order_read');
        req.audit && req.audit.setResource(id);

        const query = db.collection('lab-orders').where('order-id', '==', id);
        const snap = await query.get();

        if (snap.size > 0) {
            return res.status(200).json(snap.docs[0].data());
        }
        return res.status(404).json({ error: 'not_found', request_id: req.id });
    } catch (e) {
        return next(e);
    }
});

// Update the lab order for a customer/practitioner
router.put('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        logger.info({ request_id: req.id }, 'lab_order_update');
        req.audit && req.audit.setResource(id);

        const data = extractLabOrderData(req);
        const messageId = await publishMessage(pubSubClient, topicName, data);
        await db.collection('lab-orders').doc(id).set(data);

        res.status(200).json({
            action: 'LAB ORDER UPDATE',
            success: true,
            message_id: messageId,
        });
    } catch (e) {
        next(e);
    }
});

// See if lab order exists
router.head('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        req.audit && req.audit.setResource(id);

        const query = db.collection('lab-orders').where('order-id', '==', id);
        const snap = await query.get();
        res.status(snap.size > 0 ? 200 : 404).end();
    } catch (e) {
        next(e);
    }
});

// Delete the lab order for a customer/practitioner
router.delete('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        logger.warn({ request_id: req.id }, 'lab_order_delete');
        req.audit && req.audit.setResource(id);

        await db.collection('lab-orders').doc(id).delete();
        res.status(204).end();
    } catch (e) {
        next(e);
    }
});

module.exports = router;

function extractLabOrderData(req) {
    return {
        'order-id': req.body['order-id'],
        'customer-id': req.body['customer-id'],
        prefix: req.body['prefix'],
        'invoice-num': req.body['invoice-num'],
        'invoice-date': req.body['invoice-date'],
        'prac-id': process.env.CLINIC_PRACT_ID,
        'prac-name': req.body['prac-name'],
        'print-batch-id': req.body['print-batch-id'],
        'loc-pos': process.env.LOC_POS,
        'owner-fname': req.body['owner-fname'],
        'owner-mname': req.body['owner-mname'],
        'owner-lname': req.body['owner-lname'],
        'patient-fname': req.body['patient-fname'],
        'patient-mname': req.body['patient-mname'],
        'patient-lname': req.body['patient-lname'],
        'patient-gender': req.body['patient-gender'],
        'patient-age': req.body['patient-age'],
        'patient-dob': req.body['patient-dob'],
        'patient-ssn': req.body['patient-ssn'],
        'patient-address': req.body['patient-address'],
        'patient-city': req.body['patient-city'],
        'patient-state': req.body['patient-state'],
        'patient-country': req.body['patient-country'],
        'patient-zip': req.body['patient-zip'],
        'patient-phday': req.body['patient-phday'],
        'patient-pheve': req.body['patient-pheve'],
        'ship-method': req.body['ship-method'],
        'tracking-num': req.body['tracking-num'],
        'ship-priority': req.body['ship-priority'],
        'date-received': Date.now(),
        'date-drawn': req.body['date-drawn'],
        species: req.body['species'],
        breed: req.body['breed'],
        'sample-type': req.body['sample-type'],
        'sample-volume': req.body['sample-volume'],
        'patient-phase': req.body['patient-phase'],
        'patient-cycle-day': req.body['patient-cycle-day'],
        'patient-cycle-length': req.body['patient-cycle-length'],
        storage: req.body['storage'],
        diagnoses: req.body['diagnoses'],
        icd9: req.body['icd9'],
        'test-ordered': req.body['test-ordered'],
        locale: req.body['locale'],
        'test-priority': req.body['test-priority'],
        'rush-date': req.body['rush-date'],
        'bill-method': req.body['bill-method'],
        'bill-ref': req.body['bill-ref'],
        'check-amount': req.body['check-amount'],
        status: req.body['status'],
        'report-template': req.body['report-template'],
        comment: req.body['comment'],
        'entry-comment': req.body['entry-comment'],
        'reject-code': req.body['reject-code'],
        'processing-comment': req.body['processing-comment'],
        'ordered-date': req.body['ordered-date'],
        'ordered-by': req.body['ordered-by'],
        request: req.body['request'],
        'do-not-send': req.body['do-not-send'],
        verified: req.body['verified'],
        'sent-to-blis': req.body['sent-to-blis'],
        'sent-to-qb': req.body['sent-to-qb'],
        'label-amount': req.body['label-amount'],
        'label-print-status': req.body['label-print-status'],
        'override-partner-processing': req.body['override-partner-processing'],
        'partner-id': req.body['partner-id'],
        'partner-status-id': req.body['partner-status-id'],
        'partner-processing-comment': req.body['partner-processing-comment'],
        'time-drawn': req.body['time-drawn'],
        'time-zone-drawn': req.body['time-zone-drawn'],
        'partner-order-id': req.body['partner-order-id'],
        'approved-order-type-id': req.body['approved-order-type-id'],
    };
}

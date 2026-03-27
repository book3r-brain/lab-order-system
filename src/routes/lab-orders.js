'use strict';

const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');

const labOrders = require('../repositories/lab-order-repo');
const pubsubRepository = require('../repositories/pub-sub-repo');
const asyncHandler = require('../middleware/async-handler');
const logger = require('../logger');

const router = express.Router();

const pubSubClient = new PubSub();
const { publishMessage } = pubsubRepository;
const TOPIC = 'lab_order_topic';

/**
 * Resolve the acting principal's customer-id.
 *
 * Once GLB-01 (auth middleware) lands, req.principal.customerId will
 * be populated from the verified session token. Until then we fall
 * back to the x-actor-id header so the IDOR-safe repository is
 * exercised end-to-end. When auth ships, delete the header fallback.
 */
function resolveActorId(req) {
    if (req.principal && req.principal.customerId) {
        return String(req.principal.customerId);
    }
    const hdr = req.get('x-actor-id');
    if (hdr) return String(hdr);

    const err = new Error('Unauthenticated');
    err.status = 401;
    throw err;
}

/* ------------------------------------------------------------------------- */
/* Routes                                                                    */
/* ------------------------------------------------------------------------- */

// Create lab order for the acting customer.
router.post('/', asyncHandler(async (req, res) => {
    const actorId = resolveActorId(req);
    const orderId = String(req.body['order-id'] || '');

    const data = extractLabOrderData(req);
    const record = await labOrders.create(orderId, data, actorId);

    const messageId = await publishMessage(pubSubClient, TOPIC, record);

    logger.info('LabOrder create published', {
        requestId: req.id, actorId, orderId, messageId,
    });

    res.status(201).json({
        action: 'LAB ORDER CREATE',
        success: true,
        messageId,
    });
}));

// List all lab orders owned by the actor.
router.get('/', asyncHandler(async (req, res) => {
    const actorId = resolveActorId(req);

    const collection = await labOrders.listByActor(actorId);

    if (Object.keys(collection).length === 0) {
        return res.status(404).json({ status: 'Not found' });
    }
    res.status(200).json(collection);
}));

// Get a single lab order (404 if not found OR not owned).
router.get('/:id', asyncHandler(async (req, res) => {
    const actorId = resolveActorId(req);
    const orderId = String(req.params.id);

    const doc = await labOrders.getById(orderId, actorId);
    if (doc === null) {
        return res.status(404).json({ status: 'Not found' });
    }
    res.status(200).json(doc);
}));

// Update a lab order (404 if not found OR not owned).
router.put('/:id', asyncHandler(async (req, res) => {
    const actorId = resolveActorId(req);
    const orderId = String(req.params.id);

    const data = extractLabOrderData(req);
    const record = await labOrders.update(orderId, data, actorId);

    if (record === null) {
        return res.status(404).json({ status: 'Not found' });
    }

    const messageId = await publishMessage(pubSubClient, TOPIC, record);

    logger.info('LabOrder update published', {
        requestId: req.id, actorId, orderId, messageId,
    });

    res.status(200).json({
        action: 'LAB ORDER UPDATE',
        success: true,
        messageId,
    });
}));

// Existence check (404 if not found OR not owned).
router.head('/:id', asyncHandler(async (req, res) => {
    const actorId = resolveActorId(req);
    const orderId = String(req.params.id);

    const found = await labOrders.exists(orderId, actorId);
    res.sendStatus(found ? 200 : 404);
}));

// Delete a lab order (404 if not found OR not owned).
router.delete('/:id', asyncHandler(async (req, res) => {
    const actorId = resolveActorId(req);
    const orderId = String(req.params.id);

    const removed = await labOrders.remove(orderId, actorId);
    if (!removed) {
        return res.status(404).json({ status: 'Not found' });
    }
    res.sendStatus(204);
}));

module.exports = router;

/* ------------------------------------------------------------------------- */
/* Field allow-list                                                          */
/* ------------------------------------------------------------------------- */

function extractLabOrderData(req) {
    return {
        'order-id': req.body['order-id'],
        'customer-id': req.body['customer-id'],
        'prefix': req.body['prefix'],
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
        'species': req.body['species'],
        'breed': req.body['breed'],
        'sample-type': req.body['sample-type'],
        'sample-volume': req.body['sample-volume'],
        'patient-phase': req.body['patient-phase'],
        'patient-cycle-day': req.body['patient-cycle-day'],
        'patient-cycle-length': req.body['patient-cycle-length'],
        'storage': req.body['storage'],
        'diagnoses': req.body['diagnoses'],
        'icd9': req.body['icd9'],
        'test-ordered': req.body['test-ordered'],
        'locale': req.body['locale'],
        'test-priority': req.body['test-priority'],
        'rush-date': req.body['rush-date'],
        'bill-method': req.body['bill-method'],
        'bill-ref': req.body['bill-ref'],
        'check-amount': req.body['check-amount'],
        'status': req.body['status'],
        'report-template': req.body['report-template'],
        'comment': req.body['comment'],
        'entry-comment': req.body['entry-comment'],
        'reject-code': req.body['reject-code'],
        'processing-comment': req.body['processing-comment'],
        'ordered-date': req.body['ordered-date'],
        'ordered-by': req.body['ordered-by'],
        'request': req.body['request'],
        'do-not-send': req.body['do-not-send'],
        'verified': req.body['verified'],
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

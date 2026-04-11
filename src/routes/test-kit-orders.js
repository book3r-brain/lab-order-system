const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');

const defaultDb = require('../database.js');
const { publishMessage } = require('../repositories/pub-sub-repo');
const { logAuditEvent } = require('../security/audit');
const { canAccessCustomerId, isPrivileged, requireAuthenticated } = require('../security/auth');
const { handleRouteError, sendError } = require('../security/http');
const { buildTestKitOrderEvent } = require('../security/pubsub-payloads');
const { createRateLimiter } = require('../security/rate-limit');
const { redactTestKitOrder } = require('../security/redaction');
const { isSoftDeleted, markSoftDeleted } = require('../security/soft-delete');
const {
    ValidationError,
    assertValidId,
    assertValidStatus,
} = require('../security/validation');

const router = express.Router();
const pubSubClient = new PubSub();
const topicName = 'test_kit_topic';

const testKitProbeLimiter = createRateLimiter({
    max: 3,
    name: 'test-kit-probe',
});

router.use(requireAuthenticated);

router.get('/:id', testKitProbeLimiter, async (req, res) => {
    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const record = await findTestKitOrder(req, id);

        if (!record || !canAccessCustomerId(req, record.data['customer-id'])) {
            return sendError(res, 404, 'Not found');
        }

        logAuditEvent(req, {
            action: 'test-kit-order.read',
            resourceId: id,
            success: true,
        });

        return res.status(200).json(redactTestKitOrder(record.data, isPrivileged(req)));
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.post('/:id', async (req, res) => {
    const now = getNow(req);

    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const existing = await findTestKitOrder(req, id);

        if (!existing || !canAccessCustomerId(req, existing.data['customer-id'])) {
            return sendError(res, 404, 'Not found');
        }

        const data = extractTestKitDataFromRequest(req, id);
        validateTestKitPayload(data);

        const messageId = await getPublisher(req)(buildTestKitOrderEvent('updated', data, now));

        await getDb(req).collection('test-kit-orders').doc(existing.id).set({
            ...existing.data,
            ...data,
            'updated-at': now.toISOString(),
        });

        logAuditEvent(req, {
            action: 'test-kit-order.update',
            resourceId: id,
            success: true,
        });

        return res.status(200).json({
            action: 'TEST KIT ORDER UPDATE',
            success: true,
            message: `Message ${messageId} published :)`,
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.post('/', async (req, res) => {
    const now = getNow(req);

    try {
        const data = extractTestKitDataFromRequest(req);
        validateTestKitPayload(data);

        if (!canAccessCustomerId(req, data['customer-id'])) {
            throw new ValidationError('Invalid customer-id');
        }

        const messageId = await getPublisher(req)(buildTestKitOrderEvent('created', data, now));

        await getDb(req).collection('test-kit-orders').doc(data['order-id']).set({
            ...data,
            'created-at': now.toISOString(),
            'updated-at': now.toISOString(),
        });

        logAuditEvent(req, {
            action: 'test-kit-order.create',
            resourceId: data['order-id'],
            success: true,
        });

        return res.status(201).json({
            action: 'TEST KIT ORDER CREATE',
            success: true,
            message: `Message ${messageId} published :)`,
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const existing = await findTestKitOrder(req, id);

        if (!existing || !canAccessCustomerId(req, existing.data['customer-id'])) {
            return sendError(res, 404, 'Not found');
        }

        const deletedRecord = markSoftDeleted(existing.data, req.actor.id, getNow(req));

        await getDb(req).collection('test-kit-orders').doc(existing.id).set(deletedRecord);

        logAuditEvent(req, {
            action: 'test-kit-order.delete',
            resourceId: id,
            success: true,
        });

        return res.status(200).json({
            action: 'TEST KIT ORDER DELETE',
            deleted: true,
            success: true,
            retentionUntil: deletedRecord['retention-until'],
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

module.exports = router;

async function findTestKitOrder(req, id) {
    const snapshot = await getDb(req).collection('test-kit-orders').where('order-id', '==', id).get();
    const match = snapshot.docs.find((doc) => !isSoftDeleted(doc.data()));

    if (!match) {
        return null;
    }

    return {
        id: match.id,
        data: match.data(),
    };
}

function getDb(req) {
    return req.app.locals.db || defaultDb;
}

function getNow(req) {
    return req.app.locals.clock ? req.app.locals.clock() : new Date();
}

function getPublisher(req) {
    if (req.app.locals.publishTestKitMessage) {
        return req.app.locals.publishTestKitMessage;
    }

    return (payload) => publishMessage(pubSubClient, topicName, payload);
}

function validateTestKitPayload(data) {
    assertValidId(data['order-id'], 'order-id', { required: true });
    assertValidId(data['customer-id'], 'customer-id', { required: true });
    assertValidId(data['kit-id'], 'kit-id');
    assertValidStatus(data.status);
}

function extractTestKitDataFromRequest(req, expectedOrderId) {
    const orderId = req.body['order-id'] || expectedOrderId;

    if (expectedOrderId && orderId !== expectedOrderId) {
        throw new ValidationError('Invalid order-id');
    }

    return {
        'order-id': orderId,
        'customer-id': req.body['customer-id'],
        'pract-id': process.env.CLINIC_PRACT_ID,
        'order-taker': process.env.ORDER_TAKER,
        'requester': process.env.NAME_OF_REQUESTOR ? `${process.env.NAME_OF_REQUESTOR}${orderId}` : undefined,
        'process-type': req.body['process-type'],
        'loc-pos': req.body['loc-pos'],
        'clinic-name': req.body['clinic-name'],
        'address1': req.body['address1'],
        'address2': req.body['address2'],
        'city': req.body['city'],
        'state': req.body['state'],
        'zip': req.body['zip'],
        'country': req.body['country'],
        'req-loc': process.env.REQ_LOC,
        'shipping-method': req.body['shipping-method'],
        'tracking-num': req.body['tracking-num'],
        'processing-status': req.body['processing-status'] || process.env.STATUS,
        'status': req.body['status'],
        'comment': req.body['comment'],
        'kit-id': req.body['kit-id'],
    };
}

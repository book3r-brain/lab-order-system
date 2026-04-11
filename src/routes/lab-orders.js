const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');

const defaultDb = require('../database.js');
const { publishMessage } = require('../repositories/pub-sub-repo');
const { logAuditEvent } = require('../security/audit');
const { canAccessCustomerId, isPrivileged, requireAuthenticated } = require('../security/auth');
const { handleRouteError, sendError } = require('../security/http');
const { buildLabOrderEvent } = require('../security/pubsub-payloads');
const { createRateLimiter } = require('../security/rate-limit');
const { redactLabOrder } = require('../security/redaction');
const { isSoftDeleted, markSoftDeleted } = require('../security/soft-delete');
const {
    ValidationError,
    assertValidDate,
    assertValidId,
    assertValidSsn,
    assertValidStatus,
    paginate,
    parsePagination,
} = require('../security/validation');

const router = express.Router();
const pubSubClient = new PubSub();
const topicName = 'lab_order_topic';

const labOrderProbeLimiter = createRateLimiter({
    max: 3,
    name: 'lab-order-probe',
});

router.use(requireAuthenticated);

router.post('/', async (req, res) => {
    const now = getNow(req);

    try {
        const data = extractLabOrderData(req);
        validateLabOrderPayload(data);
        enforceCustomerAccess(req, data['customer-id']);

        const messageId = await getPublisher(req)(buildLabOrderEvent('created', data, now));

        await getDb(req).collection('lab-orders').doc(data['order-id']).set({
            ...data,
            'created-at': now.toISOString(),
            'updated-at': now.toISOString(),
        });

        logAuditEvent(req, {
            action: 'lab-order.create',
            resourceId: data['order-id'],
            success: true,
        });

        return res.status(201).json({
            action: 'LAB ORDER CREATE',
            success: true,
            message: `Message ${messageId} published :)`,
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.get('/', async (req, res) => {
    try {
        const requestedCustomerId = req.query['customer-id'];
        const customerId = isPrivileged(req)
            ? (requestedCustomerId || req.actor.customerId)
            : req.actor.customerId;

        assertValidId(customerId, 'customer-id', { required: true });

        const { page, pageSize } = parsePagination(req.query);
        const snapshot = await getDb(req).collection('lab-orders').where('customer-id', '==', customerId).get();

        const records = snapshot.docs
            .map((doc) => doc.data())
            .filter((record) => !isSoftDeleted(record))
            .map((record) => redactLabOrder(record, isPrivileged(req)));

        logAuditEvent(req, {
            action: 'lab-order.list',
            resourceId: customerId,
            success: true,
        });

        return res.status(200).json({
            data: paginate(records, page, pageSize),
            page,
            pageSize,
            total: records.length,
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.get('/:id', labOrderProbeLimiter, async (req, res) => {
    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const record = await findLabOrder(req, id);

        if (!record || !canAccessCustomerId(req, record.data['customer-id'])) {
            return sendError(res, 404, 'Not found');
        }

        logAuditEvent(req, {
            action: 'lab-order.read',
            resourceId: id,
            success: true,
        });

        return res.status(200).json(redactLabOrder(record.data, isPrivileged(req)));
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.put('/:id', async (req, res) => {
    const now = getNow(req);

    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const existing = await findLabOrder(req, id);

        if (!existing || !canAccessCustomerId(req, existing.data['customer-id'])) {
            return sendError(res, 404, 'Not found');
        }

        const data = extractLabOrderData(req, id);
        validateLabOrderPayload(data);
        enforceCustomerAccess(req, data['customer-id']);

        const messageId = await getPublisher(req)(buildLabOrderEvent('updated', data, now));

        await getDb(req).collection('lab-orders').doc(existing.id).set({
            ...existing.data,
            ...data,
            'created-at': existing.data['created-at'] || now.toISOString(),
            'updated-at': now.toISOString(),
        });

        logAuditEvent(req, {
            action: 'lab-order.update',
            resourceId: id,
            success: true,
        });

        return res.status(201).json({
            action: 'LAB ORDER UPDATE',
            success: true,
            message: `Message ${messageId} published :)`,
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.head('/:id', labOrderProbeLimiter, async (req, res) => {
    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const record = await findLabOrder(req, id);

        if (!record || !canAccessCustomerId(req, record.data['customer-id'])) {
            return res.status(404).end();
        }

        logAuditEvent(req, {
            action: 'lab-order.exists',
            resourceId: id,
            success: true,
        });

        return res.status(200).end();
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).end();
        }

        return res.status(500).end();
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const existing = await findLabOrder(req, id);

        if (!existing || !canAccessCustomerId(req, existing.data['customer-id'])) {
            return sendError(res, 404, 'Not found');
        }

        const deletedRecord = markSoftDeleted(existing.data, req.actor.id, getNow(req));

        await getDb(req).collection('lab-orders').doc(existing.id).set(deletedRecord);

        logAuditEvent(req, {
            action: 'lab-order.delete',
            resourceId: id,
            success: true,
        });

        return res.status(200).json({
            action: 'LAB ORDER DELETE',
            deleted: true,
            success: true,
            retentionUntil: deletedRecord['retention-until'],
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

module.exports = router;

function enforceCustomerAccess(req, customerId) {
    if (!canAccessCustomerId(req, customerId)) {
        throw new ValidationError('Invalid customer-id');
    }
}

async function findLabOrder(req, id) {
    const snapshot = await getDb(req).collection('lab-orders').where('order-id', '==', id).get();

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
    if (req.app.locals.publishLabOrderMessage) {
        return req.app.locals.publishLabOrderMessage;
    }

    return (payload) => publishMessage(pubSubClient, topicName, payload);
}

function validateLabOrderPayload(data) {
    assertValidId(data['order-id'], 'order-id', { required: true });
    assertValidId(data['customer-id'], 'customer-id', { required: true });
    assertValidId(data['correlation-id'], 'correlation-id');
    assertValidDate(data['patient-dob'], 'patient-dob');
    assertValidSsn(data['patient-ssn']);
    assertValidStatus(data.status);
}

function extractLabOrderData(req, expectedOrderId) {
    const orderId = req.body['order-id'] || expectedOrderId;

    if (expectedOrderId && orderId !== expectedOrderId) {
        throw new ValidationError('Invalid order-id');
    }

    return {
        'order-id': orderId,
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
        'date-received': req.body['date-received'] || getNow(req).toISOString(),
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
        'correlation-id': req.body['correlation-id'],
    };
}

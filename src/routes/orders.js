const express = require('express');

const defaultDb = require('../database.js');
const { logAuditEvent } = require('../security/audit');
const { canAccessEmail, isPrivileged, requireAuthenticated } = require('../security/auth');
const { handleRouteError, sendError } = require('../security/http');
const { createRateLimiter } = require('../security/rate-limit');
const { redactShopifyOrder } = require('../security/redaction');
const {
    assertValidEmail,
    assertValidId,
    paginate,
    parsePagination,
} = require('../security/validation');

const router = express.Router();

const searchRateLimiter = createRateLimiter({
    max: 3,
    name: 'order-search',
});

router.use(requireAuthenticated);

router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        assertValidId(id, 'order-id', { required: true });

        const record = await findOrderById(req, id);

        if (!record) {
            return sendError(res, 404, 'Not found');
        }

        if (!isPrivileged(req) && !canAccessEmail(req, record.email)) {
            return sendError(res, 404, 'Not found');
        }

        logAuditEvent(req, {
            action: 'shopify-order.read',
            resourceId: id,
            success: true,
        });

        return res.status(200).json(redactShopifyOrder(record));
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.post('/', searchRateLimiter, async (req, res) => {
    try {
        const email = req.body.email;
        assertValidEmail(email, 'email', { required: true });

        if (!canAccessEmail(req, email)) {
            return sendError(res, 403, 'Forbidden');
        }

        const { page, pageSize } = parsePagination(req.body);
        const snapshot = await getDb(req).collection('orders').where('email', '==', email).get();
        const records = snapshot.docs.map((doc) => redactShopifyOrder(doc.data()));

        logAuditEvent(req, {
            action: 'shopify-order.search',
            resourceId: 'email-search',
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

module.exports = router;

async function findOrderById(req, id) {
    const numericId = Number.parseInt(id, 10);
    const queryValue = Number.isNaN(numericId) ? id : numericId;
    const snapshot = await getDb(req).collection('orders').where('id', '==', queryValue).get();

    if (snapshot.empty) {
        return null;
    }

    return snapshot.docs[0].data();
}

function getDb(req) {
    return req.app.locals.db || defaultDb;
}

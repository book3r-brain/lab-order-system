const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { logger } = require('../logger');

router.get('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        req.audit && req.audit.setResource(id);
        logger.info({ request_id: req.id }, 'shopify_customer_read');

        const query = db.collection('customers').where('id', '==', Number(id));
        const snap = await query.get();

        if (snap.size > 0) {
            return res.status(200).json(snap.docs[0].data());
        }
        return res.status(404).json({ error: 'not_found', request_id: req.id });
    } catch (e) {
        return next(e);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const email = req.body && req.body.email;
        logger.info({ request_id: req.id }, 'shopify_customer_email_search');

        const query = db.collection('customers').where('email', '==', email);
        const snap = await query.get();

        if (snap.size > 0) {
            return res.status(200).json(getDocuments(snap));
        }
        return res.status(404).json({ error: 'not_found', request_id: req.id });
    } catch (e) {
        return next(e);
    }
});

router.post('/create', async (req, res, next) => {
    try {
        const id = (req.body && req.body.id) || Date.now();
        const customerData = req.body || {};
        req.audit && req.audit.setResource(String(id));
        logger.info({ request_id: req.id }, 'shopify_customer_create');

        await db.collection('customers').doc(String(id)).set(customerData);

        res.status(201).json({
            action: 'CUSTOMER CREATE',
            success: true,
            id,
        });
    } catch (e) {
        next(e);
    }
});

function getDocuments(snapshot) {
    const data = [];
    snapshot.forEach((doc) => data.push(doc.data()));
    return data;
}

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { logger } = require('../logger');

/********************************** Shopify Data *************************************************************************/
router.get('/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        req.audit && req.audit.setResource(id);
        logger.info({ request_id: req.id }, 'shopify_order_read');

        const query = db.collection('orders').where('id', '==', Number(id));
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
        logger.info({ request_id: req.id }, 'shopify_order_email_search');

        const query = db.collection('orders').where('email', '==', email);
        const snap = await query.get();

        if (snap.size > 0) {
            return res.status(200).json(getDocuments(snap));
        }
        return res.status(404).json({ error: 'not_found', request_id: req.id });
    } catch (e) {
        return next(e);
    }
});

function getDocuments(snapshot) {
    const data = [];
    snapshot.forEach((doc) => data.push(doc.data()));
    return data;
}

module.exports = router;

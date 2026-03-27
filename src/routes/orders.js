const express = require('express');
const router = express.Router();
const db = require('../database.js');
const asyncHandler = require('../middleware/async-handler');

/********************************** Shopify Data *************************************************************************/
router.get('/:id', asyncHandler(async (req, res) => {
    const id = req.params.id;
    console.log({ status: `Getting specific shopify order for order ID ${id}` });

    const query = db.collection('orders').where('id', '==', Number(id));
    const queryShapshot = await query.get();

    if (queryShapshot.size > 0) {
        res.status(200).json(queryShapshot.docs[0].data());
    } else {
        res.status(404).json({ status: 'Not found!' });
    }
}));

router.post('/', asyncHandler(async (req, res) => {
    const email = req.body.email;
    console.log({ status: `Getting specific shopify order for email ${email}` });

    const query = db.collection('orders').where('email', '==', email);
    const queryShapshot = await query.get();

    if (queryShapshot.size > 0) {
        res.status(200).json(getDocuments(queryShapshot));
    } else {
        res.status(404).json({ status: 'Not found!' });
    }
}));

// Extract documents
function getDocuments(queryShapshot) {
    var data = []
    queryShapshot.forEach(doc => {
        data.push(doc.data());
    });

    return data;
}

module.exports = router

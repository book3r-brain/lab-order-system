const express = require('express');
const router = express.Router();
const db = require('../database.js');
const asyncHandler = require('../middleware/async-handler');

router.get('/:id', asyncHandler(async (req, res) => {
    const id = req.params.id;
    console.log({ status: `Getting specific shopify customer for customer ID ${id}` });

    const query = db.collection('customers').where('id', '==', Number(id));
    const queryShapshot = await query.get();

    if (queryShapshot.size > 0) {
        res.status(200).json(queryShapshot.docs[0].data());
    } else {
        res.status(404).json({ status: 'Not found!' });
    }
}));

router.post('/', asyncHandler(async (req, res) => {
    const email = req.body.email;
    console.log({ status: `Getting specific shopify customer for email ${email}` });

    const query = db.collection('customers').where('email', '==', email);
    const queryShapshot = await query.get();

    if (queryShapshot.size > 0) {
        res.status(200).json(getDocuments(queryShapshot));
    } else {
        res.status(404).json({ status: 'Not found!' });
    }
}));

router.post('/create', asyncHandler(async (req, res) => {
    const id = req.body.id || Date.now();
    const email = req.body.email;
    const customerData = req.body;

    console.log({ status: `Creating new customer with email ${email} and id ${id}` });

    await db.collection('customers').doc(String(id)).set(customerData);

    res.status(201).json({
        action: 'CUSTOMER CREATE',
        success: true,
        id: id,
        message: 'Customer created successfully'
    });
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

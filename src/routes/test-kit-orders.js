const express = require('express');
const router = express.Router();
const db = require('../database.js');

const { PubSub } = require("@google-cloud/pubsub");
const pubsubRepository = require("../repositories/pub-sub-repo");

const pubSubClient = new PubSub();
const { publishMessage } = pubsubRepository;
const topicName = "test_kit_topic";

/********************************** Test Kits *************************************************************************/


// Get the tracking information based on test kit id
router.get('/:id', async (req, res) => {

    try {

        const id = parseInt(req.params.id);
        console.log({ status: `Getting test kit order for ID ${id}` });

        // const snapshot = await db.collection('test-kit-orders').doc(id).get();
        const query = db.collection('test-kit-orders').where('order-id', '==', id );
        const queryShapshot = await query.get();


        if (queryShapshot.size > 0) {
            const collection = {};
            queryShapshot.forEach(doc => {
                collection[doc.id] = doc.data();
            });
            res.status(200).json(collection);

            // res.status(200).json({data: {'test-kit-orders': responseContent}});
        } else {
            res.status(404).json({ status: 'Not found!' });
        }
    } catch (e) {
        console.error("NOTCH ERROR", e.message);
        res.status(400).json({"ERROR": e.message});
    }

});

// Update Test Kit
router.post('/:id', async (req, res) => {

    try {
        const id = req.params.id;

        const data = extractTestKitDataFromRequest(req, id)

        let messageId = await publishMessage(pubSubClient, topicName, data);

        const kitRef = db.collection('test-kit-orders').doc(id);

        await kitRef.update({ "kit-id": data });

        res.status(200).json({
            action: "TEST KIT ORDER UPDATE",
            success: true,
            message: `Message ${messageId} published :)`
        })

    } catch (e) {
        console.error("NOTCH ERROR", e.message);
        res.status(400).json({"ERROR": e.message});
    }


})

// Create a test kit for patient/customer/practioner.
router.post('/', async (req, res) => {
    try {
        const orderID = req.body["order-id"];

        const data = extractTestKitDataFromRequest(req, orderID)

        let messageId = await publishMessage(pubSubClient, topicName, data);

        console.log({ status: `Creating test kit order for orderID ${orderID}` });

        await db.collection('test-kit-orders').doc(orderID).set(data);

        res.status(201).json({
            action: "TEST KIT ORDER CREATE",
            success: true,
            message: `Message ${messageId} published :)`
        })

    } catch (e) {
        console.error("NOTCH ERROR", e.message);
        res.status(400).json({"ERROR": e.message});
    }


});

// Delete the test kit order for a customer/practioner
router.delete('/:id', async (req, res) => {
    try {

        const id = req.params.id;
        console.log({ status: `Delete specific test kit order for order ID ${id}` });

        const result = await db.collection('test-kit-orders').doc(id).delete();
        res.status(410).json(result);
    } catch (e) {
        console.error("NOTCH ERROR", e.message);
        res.status(400).json({"ERROR": e.message});
    }
});

module.exports = router


function extractTestKitDataFromRequest(req, id) {
    return {
        "order-id": req.body["order-id"],
        "customer-id": req.body["customer-id"],
        "pract-id": process.env.CLINIC_PRACT_ID,
        "order-taker": process.env.ORDER_TAKER,
        "requester": process.env.NAME_OF_REQUESTOR + id,
        "process-type": req.body["process-type"],
        "loc-pos": req.body["loc-pos"],
        "clinic-name": req.body["clinic-name"],
        "address1": req.body["address1"],
        "address2": req.body["address2"],
        "city": req.body["city"],
        "state": req.body["state"],
        "zip": req.body["zip"],
        "country": req.body["country"],
        "req-loc": process.env.REQ_LOC,
        "shipping-method": req.body["shipping-method"],
        "tracking-num": req.body["tracking-num"],
        "processing-status": process.env.STATUS,
        "status": req.body["status"],
        "comment": req.body["comment"],
        "kit-id": req.body["kit-id"]
    };
}

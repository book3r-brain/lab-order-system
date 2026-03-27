'use strict';

const db = require('../database');
const logger = require('../logger');

/**
 * LabOrderRepository
 *
 * IDOR-safe data-access layer for the `lab-orders` collection.
 *
 * Security contract:
 *  - EVERY method requires a non-empty `actorId`. Calling without one
 *    throws before any Firestore traffic occurs.
 *  - The actorId is pushed into the Firestore query itself
 *    (`where('customer-id', '==', actorId)`), so ownership is enforced
 *    at the data layer, not just in route code. A caller cannot
 *    "forget" the check.
 *  - When a document exists but belongs to someone else, the
 *    repository returns `null` / does nothing — indistinguishable from
 *    "not found". Route handlers should map that to 404, never 403, so
 *    existence of other users' records is not leaked.
 *  - On create/update, the stored `customer-id` is overwritten with
 *    `actorId` so a malicious body cannot assign a record to another
 *    user.
 */

const COLLECTION = 'lab-orders';

function requireActor(actorId) {
    if (typeof actorId !== 'string' || actorId.trim() === '') {
        // This is a programming error, not a client error — fail loudly.
        throw new TypeError('LabOrderRepository: actorId is required');
    }
    return actorId;
}

function requireOrderId(orderId) {
    if (typeof orderId !== 'string' || orderId.trim() === '') {
        const err = new Error('order-id is required');
        err.status = 400;
        throw err;
    }
    return orderId;
}

/**
 * List all lab orders owned by the actor.
 * Returns an object keyed by order-id.
 */
async function listByActor(actorId) {
    requireActor(actorId);

    const snapshot = await db
        .collection(COLLECTION)
        .where('customer-id', '==', actorId)
        .get();

    const out = {};
    snapshot.forEach((doc) => {
        out[doc.id] = doc.data();
    });
    return out;
}

/**
 * Fetch a single lab order by its order-id, scoped to the actor.
 * Returns the document data or null if not found / not owned.
 */
async function getById(orderId, actorId) {
    requireActor(actorId);
    requireOrderId(orderId);

    const snapshot = await db
        .collection(COLLECTION)
        .where('order-id', '==', orderId)
        .where('customer-id', '==', actorId)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }
    return snapshot.docs[0].data();
}

/**
 * Existence check, scoped to the actor. Returns boolean.
 */
async function exists(orderId, actorId) {
    const doc = await getById(orderId, actorId);
    return doc !== null;
}

/**
 * Create a new lab order owned by the actor.
 * The stored customer-id is forced to actorId regardless of body input.
 */
async function create(orderId, data, actorId) {
    requireActor(actorId);
    requireOrderId(orderId);

    const record = { ...data, 'customer-id': actorId, 'order-id': orderId };

    await db.collection(COLLECTION).doc(orderId).create(record);

    logger.info('LabOrder created', { orderId, actorId });
    return record;
}

/**
 * Update an existing lab order. Verifies ownership first; if the
 * document does not exist or is owned by someone else, returns null
 * and performs no write.
 */
async function update(orderId, data, actorId) {
    requireActor(actorId);
    requireOrderId(orderId);

    const existing = await getById(orderId, actorId);
    if (existing === null) {
        return null;
    }

    const record = { ...data, 'customer-id': actorId, 'order-id': orderId };

    await db
        .collection(COLLECTION)
        .doc(orderId)
        .set(record, { merge: true });

    logger.info('LabOrder updated', { orderId, actorId });
    return record;
}

/**
 * Delete a lab order. Verifies ownership first; if not owned, returns
 * false and performs no delete.
 */
async function remove(orderId, actorId) {
    requireActor(actorId);
    requireOrderId(orderId);

    const existing = await getById(orderId, actorId);
    if (existing === null) {
        return false;
    }

    await db.collection(COLLECTION).doc(orderId).delete();

    logger.info('LabOrder deleted', { orderId, actorId });
    return true;
}

module.exports = {
    listByActor,
    getById,
    exists,
    create,
    update,
    remove,
};

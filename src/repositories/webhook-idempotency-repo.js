'use strict';

const crypto = require('crypto');

const db = require('../database');
const logger = require('../logger');

/**
 * Webhook idempotency store.
 *
 * Guarantees that each X-Shopify-Webhook-Id is processed at most once,
 * even under concurrent delivery or Shopify's retry schedule, by
 * performing an atomic create() against a Firestore document keyed on
 * the webhook ID. Firestore's create() fails with ALREADY_EXISTS (code
 * 6) if the doc is present, which is our "seen before" signal — this
 * is race-free across multiple container replicas.
 *
 * Operational notes:
 *  - Documents carry an `expireAt` timestamp. Configure a Firestore
 *    TTL policy on this field so old receipts are garbage-collected
 *    automatically (gcloud firestore fields ttls update ...).
 *  - We store only metadata (topic, shop domain, timestamps) — never
 *    the payload — so the collection contains no PHI.
 */

const COLLECTION = 'processed-webhooks';
const DEFAULT_TTL_HOURS = 48; // Shopify retries for up to ~48h.

// Firestore doc IDs must be <=1500 bytes and must not contain '/'.
// Shopify webhook IDs are UUIDs, but hashing defensively means we
// never have to care about future format changes.
function toDocId(webhookId) {
    return crypto.createHash('sha256').update(String(webhookId)).digest('hex');
}

/**
 * Attempt to claim a webhook ID.
 *
 * Returns true  -> first time seen, caller should process the webhook.
 * Returns false -> duplicate, caller should ACK without reprocessing.
 *
 * @param {string} webhookId  X-Shopify-Webhook-Id header value
 * @param {object} [meta]     Optional non-PHI metadata to store
 * @param {number} [ttlHours] Retention window before TTL cleanup
 */
async function claim(webhookId, meta = {}, ttlHours = DEFAULT_TTL_HOURS) {
    if (!webhookId) {
        throw new TypeError('webhook-idempotency: webhookId is required');
    }

    const docId = toDocId(webhookId);
    const now = new Date();
    const expireAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const ref = db.collection(COLLECTION).doc(docId);

    try {
        await ref.create({
            webhookId: String(webhookId),
            topic: meta.topic || null,
            shop: meta.shop || null,
            firstSeenAt: now,
            expireAt,
        });
        return true;
    } catch (err) {
        // gRPC code 6 == ALREADY_EXISTS. Any other error is unexpected
        // and must propagate so we don't silently drop deliveries.
        if (err.code === 6) {
            logger.info('Webhook duplicate suppressed', {
                webhookId: String(webhookId),
                topic: meta.topic || null,
            });
            return false;
        }
        throw err;
    }
}

/**
 * Release a previously claimed webhook ID so Shopify's retry will be
 * re-processed. Call this only when downstream processing fails AFTER
 * a successful claim() and you intend to let Shopify retry.
 */
async function release(webhookId) {
    if (!webhookId) return;
    const docId = toDocId(webhookId);
    await db.collection(COLLECTION).doc(docId).delete();
}

module.exports = {
    claim,
    release,
};

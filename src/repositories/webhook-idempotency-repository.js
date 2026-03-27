const crypto = require('crypto');

const db = require('../database');

const STALE_PROCESSING_WINDOW_MS = 10 * 60 * 1000;

class WebhookIdempotencyRepository {
    constructor(firestore) {
        this.db = firestore;
        this.collection = this.db.collection('shopify-webhook-receipts');
    }

    getReceiptRef(webhookId) {
        return this.collection.doc(webhookId);
    }

    buildClaimMetadata(req) {
        return {
            topic: req.get('X-Shopify-Topic') || null,
            shopDomain: req.get('X-Shopify-Shop-Domain') || null,
            triggeredAt: req.get('X-Shopify-Triggered-At') || null,
            payloadSha256: crypto
                .createHash('sha256')
                .update(req.rawBody || Buffer.alloc(0))
                .digest('hex'),
        };
    }

    async claim(webhookId, metadata) {
        const receiptRef = this.getReceiptRef(webhookId);
        const now = Date.now();

        return this.db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(receiptRef);

            if (!snapshot.exists) {
                transaction.create(receiptRef, {
                    webhookId,
                    status: 'processing',
                    claimedAt: now,
                    lastSeenAt: now,
                    duplicateCount: 0,
                    attempts: 1,
                    metadata,
                });

                return {
                    duplicate: false,
                    receiptRef,
                };
            }

            const existing = snapshot.data();
            const claimedAt = existing.claimedAt || 0;
            const isStaleProcessing = existing.status === 'processing' && (now - claimedAt) > STALE_PROCESSING_WINDOW_MS;
            const canRetry = existing.status === 'failed' || isStaleProcessing;

            if (!canRetry) {
                transaction.set(receiptRef, {
                    lastSeenAt: now,
                    duplicateCount: (existing.duplicateCount || 0) + 1,
                }, { merge: true });

                return {
                    duplicate: true,
                    receiptRef,
                    status: existing.status,
                };
            }

            transaction.set(receiptRef, {
                status: 'processing',
                claimedAt: now,
                lastSeenAt: now,
                attempts: (existing.attempts || 0) + 1,
                metadata,
                failure: null,
            }, { merge: true });

            return {
                duplicate: false,
                receiptRef,
            };
        });
    }

    buildCompletedRecord(metadata) {
        return {
            status: 'completed',
            completedAt: Date.now(),
            lastSeenAt: Date.now(),
            result: metadata || null,
            failure: null,
        };
    }

    async markFailed(receiptRef, metadata) {
        await receiptRef.set({
            status: 'failed',
            failedAt: Date.now(),
            lastSeenAt: Date.now(),
            failure: metadata || null,
        }, { merge: true });
    }
}

module.exports = new WebhookIdempotencyRepository(db);

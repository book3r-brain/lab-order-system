'use strict';

const express = require('express');
const crypto = require('crypto');

const db = require('../database.js');
const logger = require('../logger');
const asyncHandler = require('../middleware/async-handler');
const idempotency = require('../repositories/webhook-idempotency-repo');

const router = express.Router();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Maximum age of a webhook before we consider it a replay. Shopify
// retries for up to 48h, but a captured request replayed later than a
// few minutes is almost certainly malicious. 5 minutes is the
// industry-standard window (matches Stripe/Slack guidance).
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

// Small forward tolerance for clock skew between Shopify and us.
const CLOCK_SKEW_MS = 30 * 1000;

// Fail fast if the webhook secret is not configured. An empty secret
// would make HMAC verification trivially bypassable.
const WEBHOOK_SECRET = process.env.SHOPIFY_API_WEBHOOK;
if (!WEBHOOK_SECRET) {
    throw new Error(
        'SHOPIFY_API_WEBHOOK is not set. Refusing to start: webhook ' +
        'signature verification would be disabled.'
    );
}

// ---------------------------------------------------------------------------
// Verification middleware
// ---------------------------------------------------------------------------

/**
 * Verify that an incoming request genuinely originated from Shopify
 * and is not a replay of a previously captured request.
 *
 * Checks performed:
 *   1. Presence of raw body + HMAC header.
 *   2. HMAC-SHA256 over the raw request bytes, compared in constant
 *      time via crypto.timingSafeEqual to prevent timing oracles.
 *   3. X-Shopify-Triggered-At timestamp must fall within
 *      REPLAY_WINDOW_MS of "now" (with a small forward skew
 *      allowance). Older requests are rejected as replays.
 *
 * On any failure we return 401 with a generic body and log the
 * reason internally. We never echo the computed digest or the
 * reason to the caller.
 */
function verifyShopifyWebhook(req, res, next) {
    const fail = (reason) => {
        logger.warn('Webhook rejected', {
            requestId: req.id,
            reason,
            path: req.originalUrl,
            ip: req.ip,
            shop: req.get('X-Shopify-Shop-Domain'),
            webhookId: req.get('X-Shopify-Webhook-Id'),
        });
        // Generic response — do not leak which check failed.
        return res.status(401).json({ error: 'Unauthorized', requestId: req.id });
    };

    // --- 1. Required inputs -------------------------------------------------
    const providedHmac = req.get('X-Shopify-Hmac-Sha256');
    if (!providedHmac) {
        return fail('missing_hmac_header');
    }
    if (!req.rawBody || req.rawBody.length === 0) {
        return fail('missing_raw_body');
    }

    // --- 2. Constant-time HMAC comparison ----------------------------------
    const computed = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('base64');

    let providedBuf;
    try {
        providedBuf = Buffer.from(providedHmac, 'base64');
    } catch {
        return fail('malformed_hmac_header');
    }
    const computedBuf = Buffer.from(computed, 'base64');

    // timingSafeEqual throws if lengths differ; guard first. A length
    // mismatch already proves the signature is wrong, and revealing
    // length via timing is not useful to an attacker here because
    // SHA-256 digests are fixed-length.
    if (
        providedBuf.length !== computedBuf.length ||
        !crypto.timingSafeEqual(providedBuf, computedBuf)
    ) {
        return fail('hmac_mismatch');
    }

    // --- 3. Replay window --------------------------------------------------
    const triggeredAt = req.get('X-Shopify-Triggered-At');
    if (!triggeredAt) {
        return fail('missing_triggered_at');
    }
    const triggeredMs = Date.parse(triggeredAt);
    if (Number.isNaN(triggeredMs)) {
        return fail('invalid_triggered_at');
    }
    const now = Date.now();
    if (triggeredMs > now + CLOCK_SKEW_MS) {
        return fail('triggered_at_in_future');
    }
    if (now - triggeredMs > REPLAY_WINDOW_MS) {
        return fail('replay_window_exceeded');
    }

    logger.info('Webhook verified', {
        requestId: req.id,
        topic: req.get('X-Shopify-Topic'),
        webhookId: req.get('X-Shopify-Webhook-Id'),
    });
    return next();
}

/**
 * Exactly-once delivery guard.
 *
 * Runs AFTER signature verification so unauthenticated callers cannot
 * pollute the idempotency store. Uses an atomic Firestore create() to
 * claim the X-Shopify-Webhook-Id:
 *   - first claim  -> proceed to handler
 *   - duplicate    -> return 200 immediately (Shopify treats non-2xx
 *                     as failure and retries; we must ACK duplicates)
 *
 * If the downstream handler throws, we release() the claim so the
 * next Shopify retry is not suppressed.
 */
async function enforceIdempotency(req, res, next) {
    const webhookId = req.get('X-Shopify-Webhook-Id');
    if (!webhookId) {
        logger.warn('Webhook missing X-Shopify-Webhook-Id', {
            requestId: req.id,
            path: req.originalUrl,
        });
        return res
            .status(401)
            .json({ error: 'Unauthorized', requestId: req.id });
    }

    const topic = req.get('X-Shopify-Topic');
    const shop = req.get('X-Shopify-Shop-Domain');

    let firstSeen;
    try {
        firstSeen = await idempotency.claim(webhookId, { topic, shop });
    } catch (err) {
        return next(err);
    }

    if (!firstSeen) {
        // Already processed — ACK so Shopify stops retrying.
        return res.status(200).send('OK');
    }

    // Stash the ID so route handlers can release on failure.
    req.webhookId = webhookId;
    return next();
}

// Optional local-dev bypass. Must be explicitly opted into AND we must
// not be running in production. Never silently disables verification.
const devBypass =
    process.env.NODE_ENV !== 'production' &&
    process.env.SKIP_WEBHOOK_VERIFY === '1';

if (devBypass) {
    logger.warn(
        'Shopify webhook signature verification is BYPASSED. ' +
        'This must never happen in production.'
    );
} else {
    router.use(verifyShopifyWebhook);
}

// Idempotency always runs, even in dev — it protects against
// accidental double-processing during local testing too.
router.use(asyncHandler(enforceIdempotency));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post('/orders/create', asyncHandler(async (req, res) => {
    try {
        const orderData = req.body;
        const orderId = orderData && orderData.id;
        if (!orderId) {
            const err = new Error('Webhook payload missing order id');
            err.status = 400;
            throw err;
        }

        await db.collection('orders').doc(String(orderId)).set(orderData);

        logger.info('Order webhook processed', {
            requestId: req.id,
            orderId: String(orderId),
            webhookId: req.webhookId,
        });
        res.status(200).send('OK');
    } catch (err) {
        // Roll back the idempotency claim so Shopify's retry succeeds.
        await idempotency.release(req.webhookId);
        throw err;
    }
}));

router.post('/customer', asyncHandler(async (req, res) => {
    try {
        const customerData = req.body;
        const customerId = customerData && customerData.id;
        if (!customerId) {
            const err = new Error('Webhook payload missing customer id');
            err.status = 400;
            throw err;
        }

        await db.collection('customers').doc(String(customerId)).set(customerData);

        logger.info('Customer webhook processed', {
            requestId: req.id,
            customerId: String(customerId),
            webhookId: req.webhookId,
        });
        res.status(200).send('OK');
    } catch (err) {
        await idempotency.release(req.webhookId);
        throw err;
    }
}));

module.exports = router;
module.exports.verifyShopifyWebhook = verifyShopifyWebhook;
module.exports.enforceIdempotency = enforceIdempotency;

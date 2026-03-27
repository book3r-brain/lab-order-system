const crypto = require('crypto');

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
const SHOPIFY_TIMESTAMP_HEADERS = [
    'X-Shopify-Triggered-At',
    'X-Shopify-Event-Created-At',
    'X-Shopify-Webhook-Created-At',
];

function createHttpError(status, code, message) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

function parseWebhookTimestamp(rawTimestamp) {
    if (!rawTimestamp) {
        return null;
    }

    if (/^\d+$/.test(rawTimestamp)) {
        const numericTimestamp = Number(rawTimestamp);
        if (!Number.isFinite(numericTimestamp)) {
            return null;
        }

        return rawTimestamp.length === 13 ? numericTimestamp : numericTimestamp * 1000;
    }

    const parsedTimestamp = Date.parse(rawTimestamp);
    return Number.isNaN(parsedTimestamp) ? null : parsedTimestamp;
}

function getWebhookTimestamp(req) {
    for (const headerName of SHOPIFY_TIMESTAMP_HEADERS) {
        const headerValue = req.get(headerName);
        if (headerValue) {
            return {
                headerName,
                timestamp: parseWebhookTimestamp(headerValue),
                rawValue: headerValue,
            };
        }
    }

    return {
        headerName: SHOPIFY_TIMESTAMP_HEADERS[0],
        timestamp: null,
        rawValue: null,
    };
}

function verifyShopifyWebhook(req, res, next) {
    const webhookSecret = process.env.SHOPIFY_API_WEBHOOK;
    if (!webhookSecret) {
        return next(createHttpError(500, 'SHOPIFY_WEBHOOK_SECRET_MISSING', 'Webhook secret is not configured.'));
    }

    const providedSignature = req.get('X-Shopify-Hmac-Sha256');
    if (!providedSignature) {
        return next(createHttpError(401, 'SHOPIFY_WEBHOOK_SIGNATURE_MISSING', 'Webhook signature is required.'));
    }

    const { headerName, timestamp, rawValue } = getWebhookTimestamp(req);
    if (!rawValue || !timestamp) {
        return next(createHttpError(401, 'SHOPIFY_WEBHOOK_TIMESTAMP_INVALID', `${headerName} header is missing or invalid.`));
    }

    const timestampDrift = Math.abs(Date.now() - timestamp);
    if (timestampDrift > FIVE_MINUTES_IN_MS) {
        return next(createHttpError(401, 'SHOPIFY_WEBHOOK_TIMESTAMP_EXPIRED', 'Webhook timestamp is outside the allowed replay window.'));
    }

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody || Buffer.alloc(0))
        .digest('base64');

    const providedSignatureBuffer = Buffer.from(providedSignature, 'utf8');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

    if (
        providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
        !crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
    ) {
        return next(createHttpError(403, 'SHOPIFY_WEBHOOK_SIGNATURE_INVALID', 'Webhook signature verification failed.'));
    }

    return next();
}

module.exports = verifyShopifyWebhook;

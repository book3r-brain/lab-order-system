const webhookIdempotencyRepository = require('../repositories/webhook-idempotency-repository');

function createHttpError(status, code, message) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

async function webhookIdempotency(req, res, next) {
    const webhookId = req.get('X-Shopify-Webhook-Id');
    if (!webhookId) {
        return next(createHttpError(400, 'SHOPIFY_WEBHOOK_ID_MISSING', 'Webhook id is required.'));
    }

    const claimResult = await webhookIdempotencyRepository.claim(
        webhookId,
        webhookIdempotencyRepository.buildClaimMetadata(req)
    );

    if (claimResult.duplicate) {
        return res.status(200).send('Webhook already processed');
    }

    req.webhookReceipt = {
        webhookId,
        receiptRef: claimResult.receiptRef,
        completed: false,
    };

    let finalized = false;
    const finalizeFailure = async () => {
        if (finalized || !req.webhookReceipt || req.webhookReceipt.completed || res.statusCode < 400) {
            return;
        }

        finalized = true;
        await webhookIdempotencyRepository.markFailed(req.webhookReceipt.receiptRef, {
            statusCode: res.statusCode,
        });
    };

    res.on('finish', () => {
        finalizeFailure().catch(() => {
            // best effort only
        });
    });

    res.on('close', () => {
        finalizeFailure().catch(() => {
            // best effort only
        });
    });

    return next();
}

module.exports = webhookIdempotency;

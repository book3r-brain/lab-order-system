const http = require('http');
const https = require('https');

const REDACTED_VALUE = '[REDACTED]';
const DEFAULT_TIMEOUT_MS = 1000;
const SENSITIVE_KEY_PATTERN = /authorization|cookie|token|secret|password|signature|hmac|ssn|dob|birth|patient|owner|address|email|phone/i;

function serializeValue(value, options, keyName, seen) {
    if (value === null || value === undefined) {
        return value;
    }

    if (Buffer.isBuffer(value)) {
        return value.toString('utf8');
    }

    if (options.redact && keyName && SENSITIVE_KEY_PATTERN.test(keyName)) {
        return REDACTED_VALUE;
    }

    if (typeof value === 'function') {
        return '[Function]';
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (seen.has(value)) {
        return '[Circular]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
        return value.map((entry) => serializeValue(entry, options, undefined, seen));
    }

    return Object.keys(value).reduce((result, key) => {
        result[key] = serializeValue(value[key], options, key, seen);
        return result;
    }, {});
}

function redactValue(value, keyName) {
    if (value === null || value === undefined) {
        return value;
    }

    return serializeValue(value, { redact: true }, keyName, new WeakSet());
}

function sanitizeHeaders(headers) {
    return Object.keys(headers || {}).reduce((result, key) => {
        result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_VALUE : headers[key];
        return result;
    }, {});
}

function buildRequestContext(req) {
    if (!req) {
        return null;
    }

    return {
        sanitized: {
            method: req.method,
            originalUrl: req.originalUrl,
            path: req.path,
            ip: req.ip,
            requestId: req.headers['x-request-id'] || null,
            userAgent: req.get('user-agent') || null,
            params: redactValue(req.params || {}),
            query: redactValue(req.query || {}),
            headers: sanitizeHeaders(req.headers || {}),
            body: redactValue(req.body || {}),
        },
        raw: {
            headers: serializeValue(req.headers || {}, { redact: false }, undefined, new WeakSet()),
            query: serializeValue(req.query || {}, { redact: false }, undefined, new WeakSet()),
            body: serializeValue(req.body || {}, { redact: false }, undefined, new WeakSet()),
            rawBody: serializeValue(req.rawBody || null, { redact: false }, undefined, new WeakSet()),
        },
    };
}

function emitLocalFallback(payload, transportError) {
    const fallbackPayload = {
        secureLoggerDeliveryFailed: Boolean(transportError),
        transportError: transportError ? transportError.message : null,
        payload: {
            ...payload,
            request: payload.request ? {
                ...payload.request,
                raw: '[omitted from local fallback]'
            } : null,
        },
    };

    console.error(JSON.stringify(fallbackPayload));
}

function sendToSecureLoggingService(payload) {
    const serviceUrl = process.env.SECURE_LOGGING_SERVICE_URL;
    if (!serviceUrl) {
        emitLocalFallback(payload);
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const targetUrl = new URL(serviceUrl);
        const client = targetUrl.protocol === 'https:' ? https : http;
        const requestBody = JSON.stringify(payload);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
        };

        if (process.env.SECURE_LOGGING_SERVICE_TOKEN) {
            headers.Authorization = `Bearer ${process.env.SECURE_LOGGING_SERVICE_TOKEN}`;
        }

        const request = client.request(
            targetUrl,
            {
                method: 'POST',
                headers,
                timeout: DEFAULT_TIMEOUT_MS,
            },
            (response) => {
                response.resume();
                if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
                    resolve();
                    return;
                }

                reject(new Error(`Secure logger responded with status ${response.statusCode || 'unknown'}.`));
            }
        );

        request.on('timeout', () => {
            request.destroy(new Error('Secure logger request timed out.'));
        });

        request.on('error', reject);
        request.write(requestBody);
        request.end();
    }).catch((error) => {
        emitLocalFallback(payload, error);
    });
}

async function logError(error, req, extraContext) {
    const fallbackPayload = {
        severity: 'ERROR',
        eventType: 'application_error',
        timestamp: new Date().toISOString(),
        error: {
            name: error.name,
            message: error.message,
            code: error.code || null,
            status: error.status || 500,
            stack: error.stack || null,
        },
        request: buildRequestContext(req),
        context: redactValue(extraContext || {}),
    };

    await sendToSecureLoggingService(fallbackPayload);
}

module.exports = {
    logError,
};

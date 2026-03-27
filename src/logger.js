'use strict';

/**
 * Structured, PHI-redacting logger.
 *
 * Writes newline-delimited JSON to stdout/stderr. On GCP (Cloud Run /
 * GKE / GCE with the Logging agent) these lines are automatically
 * parsed and forwarded to Cloud Logging, giving us centralized,
 * tamper-evident storage without adding a dependency.
 *
 * HIPAA note: every log line passes through redact() so that PHI
 * fields enumerated in PHI_KEYS are masked before they leave the
 * process. Never bypass this module with raw console.log for
 * request/response payloads.
 */

// Keys that must never appear in logs in plaintext. Matched
// case-insensitively and ignoring '-' / '_' so that patient-ssn,
// patient_ssn and patientSsn are all caught.
const PHI_KEYS = new Set(
    [
        'patient-ssn', 'ssn',
        'patient-dob', 'dob', 'date-of-birth', 'birthdate',
        'patient-fname', 'patient-lname', 'first-name', 'last-name',
        'patient-address', 'address', 'address1', 'address2',
        'patient-phday', 'phone', 'telephone',
        'email',
        'diagnoses', 'diagnosis', 'icd9', 'icd10',
        'access-token', 'access_token', 'authorization',
        'x-shopify-hmac-sha256',
        'client-secret', 'client_secret', 'password', 'secret', 'api-key',
    ].map(normalizeKey)
);

const MASK = '[REDACTED]';
const MAX_DEPTH = 6;

function normalizeKey(k) {
    return String(k).toLowerCase().replace(/[-_]/g, '');
}

function isPhiKey(k) {
    return PHI_KEYS.has(normalizeKey(k));
}

/**
 * Recursively clone `value`, replacing any PHI-keyed property with MASK.
 * Depth-limited and cycle-safe so a malicious/self-referential body
 * cannot blow the stack or hang the event loop.
 */
function redact(value, depth = 0, seen = new WeakSet()) {
    if (value === null || value === undefined) return value;

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    if (typeof value !== 'object') return value;

    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (depth >= MAX_DEPTH) return '[Truncated]';

    if (Array.isArray(value)) {
        return value.map((v) => redact(v, depth + 1, seen));
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) {
        out[k] = isPhiKey(k) ? MASK : redact(v, depth + 1, seen);
    }
    return out;
}

function write(severity, message, context) {
    const entry = {
        severity,
        time: new Date().toISOString(),
        message,
    };
    if (context !== undefined) {
        entry.context = redact(context);
    }
    const line = JSON.stringify(entry) + '\n';
    if (severity === 'ERROR' || severity === 'CRITICAL') {
        process.stderr.write(line);
    } else {
        process.stdout.write(line);
    }
}

module.exports = {
    debug: (msg, ctx) => write('DEBUG', msg, ctx),
    info: (msg, ctx) => write('INFO', msg, ctx),
    warn: (msg, ctx) => write('WARNING', msg, ctx),
    error: (msg, ctx) => write('ERROR', msg, ctx),
    critical: (msg, ctx) => write('CRITICAL', msg, ctx),
    redact,
};

/**
 * Structured logging with pino.
 *
 * Two loggers are exported:
 *
 *   - `logger`: the default application logger used for request tracing and
 *     infrastructure events. Writes to stdout as NDJSON.
 *   - `audit`:  a dedicated logger channel for PHI and authentication
 *     events. Uses a separate pino instance with `name: 'audit'` so that a
 *     downstream SIEM sink (Cloud Logging, Splunk, Datadog) can route it
 *     to write-once storage distinct from the application log stream.
 *
 * Both loggers share the same PHI/secret redaction list. Any field
 * matching a path in `PHI_REDACTION_PATHS` is replaced with `[REDACTED]`
 * before emission. The redaction uses pino's built-in redact, which is
 * applied at the serializer level so the original object is not mutated.
 *
 * Satisfies P1 items D-P1-7 (structured logger) and D-P1-9 (no console.log).
 */
const pino = require('pino');

/**
 * Redaction paths. The `*` wildcard matches a single key; pino's redact
 * traverses nested objects too.
 *
 * Covers:
 *   - HIPAA identifiers: SSN, DOB, patient name components, diagnoses, ICD.
 *   - Authentication material: Authorization headers, cookies, access
 *     tokens, JWT secrets, Shopify admin tokens.
 *   - Common PHI nesting paths used in this codebase.
 */
const PHI_REDACTION_PATHS = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-shopify-access-token"]',
    'res.headers["set-cookie"]',
    'headers.authorization',
    'headers.cookie',

    // Direct PHI fields at any depth of the payload.
    '*.patient-ssn',
    '*.patient-dob',
    '*.patient-fname',
    '*.patient-mname',
    '*.patient-lname',
    '*.patient-address',
    '*.patient-city',
    '*.patient-state',
    '*.patient-zip',
    '*.patient-phday',
    '*.patient-pheve',
    '*.diagnoses',
    '*.icd9',

    '*.access_token',
    '*.accessToken',
    '*.password',
    '*.authorization',

    // Fields seen in the root of request bodies.
    'patient-ssn',
    'patient-dob',
    'patient-fname',
    'patient-mname',
    'patient-lname',
    'patient-address',
    'patient-city',
    'patient-state',
    'patient-zip',
    'patient-phday',
    'patient-pheve',
    'diagnoses',
    'icd9',
    'access_token',
    'accessToken',
    'password',
];

const REDACT_OPTIONS = {
    paths: PHI_REDACTION_PATHS,
    censor: '[REDACTED]',
    remove: false,
};

/**
 * Build the application logger. The timestamp field is named `ts` so that
 * it aligns with the audit-log schema enforced by the test suite
 * (T-P1-10).
 */
function createAppLogger() {
    return pino(
        {
            name: 'app',
            level: process.env.LOG_LEVEL || 'info',
            base: undefined,
            timestamp: () => `,"ts":"${new Date().toISOString()}"`,
            redact: REDACT_OPTIONS,
            formatters: {
                level(label) {
                    return { level: label };
                },
            },
        },
        // Pass process.stdout explicitly so pino writes go through the
        // writable stream (which tests can patch) rather than sonic-boom
        // writing directly to fd 1. The perf delta is negligible for this
        // workload and observability wins.
        process.stdout
    );
}

/**
 * Build the audit logger. Audit events are required by:
 *
 *   - HIPAA §164.312(b) (Audit Controls)
 *   - OMB M-21-31 EL1+ (logging maturity baseline under EO 14028)
 *
 * Routing is separated by `name: 'audit'` so that the SIEM sink can
 * enforce bucket-lock / write-once retention on the audit channel
 * independently from application noise.
 */
function createAuditLogger() {
    return pino(
        {
            name: 'audit',
            level: 'info',
            base: undefined,
            timestamp: () => `,"ts":"${new Date().toISOString()}"`,
            redact: REDACT_OPTIONS,
            formatters: {
                level(label) {
                    return { level: label };
                },
            },
        },
        process.stdout
    );
}

const logger = createAppLogger();
const audit = createAuditLogger();

module.exports = {
    logger,
    audit,
    PHI_REDACTION_PATHS,
    createAppLogger,
    createAuditLogger,
};

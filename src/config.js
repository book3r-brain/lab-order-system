/**
 * Boot-time configuration validation.
 *
 * Loads and validates every security-critical environment variable with a
 * `zod` schema. Missing or malformed values cause the process to throw at
 * start-up, preventing the service from running with weak defaults.
 *
 * This module satisfies P1 item D-P1-10 and the general NIST SP 800-218
 * SSDF PS.1 requirement that security-relevant configuration be validated
 * before runtime.
 *
 * Error messages MUST NOT include the submitted secret values. The zod
 * `errorMap` below only references the field name, never the value.
 */
const { z } = require('zod');

/**
 * Resource names for GCP KMS look like:
 *   projects/<project>/locations/<loc>/keyRings/<ring>/cryptoKeys/<key>
 *   projects/<project>/locations/<loc>/keyRings/<ring>/cryptoKeys/<key>/cryptoKeyVersions/<n>
 */
const KMS_KEY_NAME_REGEX =
    /^projects\/[^/]+\/locations\/[^/]+\/keyRings\/[^/]+\/cryptoKeys\/[^/]+(?:\/cryptoKeyVersions\/\d+)?$/;

const ConfigSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: z
        .string()
        .regex(/^\d+$/, { message: 'PORT must be a numeric string' })
        .default('8080'),

    GCP_PROJECT: z.string().min(1, { message: 'GCP_PROJECT is required' }),

    SHOPIFY_SHOP: z.string().min(1, { message: 'SHOPIFY_SHOP is required' }),
    SHOPIFY_CLIENT_ID: z
        .string()
        .min(1, { message: 'SHOPIFY_CLIENT_ID is required' }),
    SHOPIFY_CLIENT_SECRET: z
        .string()
        .min(1, { message: 'SHOPIFY_CLIENT_SECRET is required' }),
    SHOPIFY_API_WEBHOOK: z
        .string()
        .min(1, { message: 'SHOPIFY_API_WEBHOOK is required' }),

    JWT_SECRET: z
        .string()
        .min(16, {
            message:
                'JWT_SECRET length must be at least 16 characters for HS256',
        }),
    JWT_ISSUER: z
        .string()
        .url({ message: 'JWT_ISSUER must be a URL' })
        .min(1, { message: 'JWT_ISSUER is required' }),
    JWT_AUDIENCE: z
        .string()
        .min(1, { message: 'JWT_AUDIENCE is required' }),

    KMS_KEY_NAME: z
        .string()
        .regex(KMS_KEY_NAME_REGEX, {
            message: 'KMS_KEY_NAME format is invalid',
        }),

    CORS_ALLOWED_ORIGINS: z.string().optional().default(''),

    // Legacy environment values kept until P2 allow-list refactor.
    CLINIC_PRACT_ID: z.string().optional().default(''),
    LOC_POS: z.string().optional().default(''),
    ORDER_TAKER: z.string().optional().default(''),
    NAME_OF_REQUESTOR: z.string().optional().default(''),
    REQ_LOC: z.string().optional().default(''),
    STATUS: z.string().optional().default(''),
});

/**
 * Build a redacted error message from a zod issue list.
 * Never include the submitted value — only the path and message.
 */
function buildConfigErrorMessage(issues) {
    const lines = issues.map((iss) => {
        const path = iss.path.join('.');
        return `  - ${path}: ${iss.message}`;
    });
    return [
        'Configuration validation failed. The following environment variables are missing or invalid:',
        ...lines,
    ].join('\n');
}

/**
 * Load and freeze the configuration. Throws on validation errors.
 * The returned object is immutable so that later code cannot mutate
 * security-critical values at runtime.
 */
function loadConfig(env = process.env) {
    const candidate = {
        NODE_ENV: env.NODE_ENV,
        PORT: env.PORT,
        GCP_PROJECT: env.GCP_PROJECT,
        SHOPIFY_SHOP: env.SHOPIFY_SHOP,
        SHOPIFY_CLIENT_ID: env.SHOPIFY_CLIENT_ID,
        SHOPIFY_CLIENT_SECRET: env.SHOPIFY_CLIENT_SECRET,
        SHOPIFY_API_WEBHOOK: env.SHOPIFY_API_WEBHOOK,
        JWT_SECRET: env.JWT_SECRET,
        JWT_ISSUER: env.JWT_ISSUER,
        JWT_AUDIENCE: env.JWT_AUDIENCE,
        KMS_KEY_NAME: env.KMS_KEY_NAME,
        CORS_ALLOWED_ORIGINS: env.CORS_ALLOWED_ORIGINS,
        CLINIC_PRACT_ID: env.CLINIC_PRACT_ID,
        LOC_POS: env.LOC_POS,
        ORDER_TAKER: env.ORDER_TAKER,
        NAME_OF_REQUESTOR: env.NAME_OF_REQUESTOR,
        REQ_LOC: env.REQ_LOC,
        STATUS: env.STATUS,
    };

    const result = ConfigSchema.safeParse(candidate);
    if (!result.success) {
        const err = new Error(buildConfigErrorMessage(result.error.issues));
        err.code = 'config_invalid';
        throw err;
    }

    return Object.freeze(result.data);
}

module.exports = { loadConfig, ConfigSchema };

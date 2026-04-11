/**
 * T-P1-14 boot-time configuration validation.
 *
 * EO 14028 / NIST SP 800-218 (SSDF) PS.1 requires that security-critical
 * configuration be validated at build or deploy time so that a
 * misconfigured service cannot silently run with weak defaults.
 *
 * The `src/config` module loads required environment variables through a
 * `zod` schema and throws on missing values. This test exercises the
 * failure path for each required variable by unsetting it before loading
 * the module under a fresh module registry.
 */
const REQUIRED_ENV = [
    'GCP_PROJECT',
    'SHOPIFY_SHOP',
    'SHOPIFY_CLIENT_ID',
    'SHOPIFY_CLIENT_SECRET',
    'SHOPIFY_API_WEBHOOK',
    'JWT_SECRET',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'KMS_KEY_NAME',
];

function loadConfigWith(envOverrides) {
    const saved = {};
    for (const [k, v] of Object.entries(envOverrides)) {
        saved[k] = process.env[k];
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    try {
        let result;
        jest.isolateModules(() => {
            // eslint-disable-next-line global-require
            result = require('../src/config').loadConfig();
        });
        return result;
    } finally {
        for (const [k, v] of Object.entries(saved)) {
            if (v === undefined) delete process.env[k];
            else process.env[k] = v;
        }
    }
}

describe('T-P1-14 boot-time config validation with zod', () => {
    test('loadConfig returns a frozen config object when all env is present', () => {
        const cfg = loadConfigWith({});
        expect(cfg).toBeDefined();
        expect(cfg.GCP_PROJECT).toBe(process.env.GCP_PROJECT);
        expect(cfg.JWT_ISSUER).toBe(process.env.JWT_ISSUER);
        expect(Object.isFrozen(cfg)).toBe(true);
    });

    test.each(REQUIRED_ENV)(
        'loadConfig throws when %s is missing',
        (name) => {
            expect(() =>
                loadConfigWith({ [name]: undefined })
            ).toThrow(/config|missing|required|env/i);
        }
    );

    test('loadConfig rejects short JWT secrets', () => {
        expect(() =>
            loadConfigWith({ JWT_SECRET: 'short' })
        ).toThrow(/JWT_SECRET|length/i);
    });

    test('loadConfig rejects malformed KMS key names', () => {
        expect(() =>
            loadConfigWith({ KMS_KEY_NAME: 'not-a-kms-resource-name' })
        ).toThrow(/KMS_KEY_NAME|format/i);
    });

    test('loadConfig never reveals secret values in the error message', () => {
        const sentinel = 'super-secret-sentinel-value-1234567890';
        try {
            loadConfigWith({
                JWT_SECRET: sentinel,
                JWT_ISSUER: undefined,
            });
        } catch (err) {
            expect(err.message).not.toContain(sentinel);
            return;
        }
        throw new Error('expected loadConfig to throw');
    });
});

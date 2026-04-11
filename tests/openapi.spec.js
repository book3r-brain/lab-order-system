/**
 * T-P1-13 OpenAPI contract reconciliation.
 *
 * The OpenAPI spec shipped in openapi2-run.yaml historically declared an
 * `api_key` security scheme in query string that was never enforced by any
 * middleware. That kind of "declared but not implemented" control is worse
 * than no documentation because it misleads auditors. This test enforces
 * one of the following is true:
 *
 *   - the spec no longer declares `api_key`, AND the spec instead declares
 *     the `bearerAuth` scheme that matches the implemented JWT middleware;
 *   - every authenticated path uses the `bearerAuth` scheme in its
 *     `security` block;
 *   - query-string `api_key` is not referenced anywhere.
 */
const path = require('path');
const YAML = require('yamljs');

describe('T-P1-13 OpenAPI spec matches the implemented security model', () => {
    const specPath = path.join(__dirname, '..', 'openapi2-run.yaml');
    const spec = YAML.load(specPath);

    test('api_key security scheme is removed', () => {
        const defs = spec.securityDefinitions || {};
        expect(defs).not.toHaveProperty('api_key');
    });

    test('bearerAuth security scheme is declared', () => {
        const defs = spec.securityDefinitions || {};
        expect(defs).toHaveProperty('bearerAuth');
        const scheme = defs.bearerAuth;
        expect(scheme.type).toBe('apiKey');
        expect(scheme.in).toBe('header');
        expect(scheme.name.toLowerCase()).toBe('authorization');
    });

    test('no path references the old api_key scheme', () => {
        const serialized = YAML.stringify(spec.paths, 10);
        expect(serialized).not.toMatch(/api_key/);
    });

    test('every non-webhook operation declares bearerAuth', () => {
        const paths = spec.paths || {};
        for (const [route, methods] of Object.entries(paths)) {
            if (/webhooks/i.test(route)) continue;
            for (const [verb, op] of Object.entries(methods)) {
                if (verb === 'parameters') continue;
                expect({ route, verb, op }).toEqual(
                    expect.objectContaining({
                        route: expect.any(String),
                        verb: expect.any(String),
                        op: expect.objectContaining({
                            security: expect.arrayContaining([
                                expect.objectContaining({ bearerAuth: [] }),
                            ]),
                        }),
                    })
                );
            }
        }
    });
});

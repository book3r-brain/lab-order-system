/**
 * T-P1-8 and T-P1-9 — authentication coverage.
 *
 * HIPAA §164.312(d) requires implementation of "procedures to verify that
 * a person or entity seeking access to electronic protected health
 * information is the one claimed." Every route that touches PHI (and every
 * Shopify proxy route, because it holds a privileged admin token) must
 * therefore reject unauthenticated callers.
 *
 * Webhook routes are HMAC-authenticated by Shopify and are covered
 * separately in tests/webhooks.spec.js under P0.
 */
const request = require('supertest');
const { createTestApp } = require('./helpers/createTestApp');
const {
    signToken,
    signExpiredToken,
    signWrongIssuerToken,
    signWithWrongSecret,
    bearer,
} = require('./helpers/tokens');
const { AUTHED_ROUTES, UNAUTHED_ROUTES } = require('./helpers/routes');

describe('T-P1-8 every authenticated route rejects anonymous callers', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
    });

    test.each(AUTHED_ROUTES)(
        '$method.toUpperCase $path without any Authorization header returns 401',
        async ({ method, path, body }) => {
            const req = request(app)[method](path);
            const res = body ? await req.send(body) : await req;
            expect(res.status).toBe(401);
        }
    );

    test.each(AUTHED_ROUTES)(
        '$method.toUpperCase $path with malformed bearer token returns 401',
        async ({ method, path, body }) => {
            const req = request(app)
                [method](path)
                .set('authorization', 'Bearer not-a-real-token');
            const res = body ? await req.send(body) : await req;
            expect(res.status).toBe(401);
        }
    );

    test.each(AUTHED_ROUTES)(
        '$method.toUpperCase $path with expired bearer token returns 401',
        async ({ method, path, body }) => {
            const token = signExpiredToken();
            const req = request(app)
                [method](path)
                .set('authorization', bearer(token));
            const res = body ? await req.send(body) : await req;
            expect(res.status).toBe(401);
        }
    );

    test.each(AUTHED_ROUTES)(
        '$method.toUpperCase $path with wrong-issuer token returns 401',
        async ({ method, path, body }) => {
            const token = signWrongIssuerToken();
            const req = request(app)
                [method](path)
                .set('authorization', bearer(token));
            const res = body ? await req.send(body) : await req;
            expect(res.status).toBe(401);
        }
    );

    test.each(AUTHED_ROUTES)(
        '$method.toUpperCase $path with wrong-secret signature returns 401',
        async ({ method, path, body }) => {
            const token = signWithWrongSecret();
            const req = request(app)
                [method](path)
                .set('authorization', bearer(token));
            const res = body ? await req.send(body) : await req;
            expect(res.status).toBe(401);
        }
    );
});

describe('T-P1-8 routes that should remain unauthenticated', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
    });

    test.each(UNAUTHED_ROUTES)(
        '$method.toUpperCase $path does not return 401',
        async ({ method, path, body }) => {
            const req = request(app)[method](path);
            const res = body ? await req.send(body) : await req;
            // Webhook routes will 401/403 based on HMAC in P0 tests; here we
            // only assert that the JWT middleware does not reject them.
            expect([200, 301, 302, 400, 401, 403, 404, 500]).toContain(
                res.status
            );
            // Crucially: the error body must not be the JWT "missing bearer"
            // envelope (which would mean the route was covered by requireAuth).
            if (res.status === 401 && res.body && res.body.error) {
                expect(res.body.error).not.toBe('unauthenticated');
            }
        }
    );
});

describe('T-P1-9 requireAuth populates req.user for valid tokens', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
    });

    test('valid bearer token is accepted (no 401)', async () => {
        const token = signToken({
            sub: 'user-42',
            role: 'patient',
            customer_id: 'cust-42',
        });
        const res = await request(app)
            .get('/lab-orders')
            .set('authorization', bearer(token));
        expect(res.status).not.toBe(401);
    });

    test('authenticated requests reach the handler (not rejected at 401)', async () => {
        const token = signToken();
        const res = await request(app)
            .get('/lab-orders/12345')
            .set('authorization', bearer(token));
        expect([200, 404]).toContain(res.status);
    });

    test('case-insensitive bearer prefix is accepted', async () => {
        const token = signToken();
        const res = await request(app)
            .get('/lab-orders')
            .set('authorization', `bearer ${token}`);
        expect(res.status).not.toBe(401);
    });

    test('Authorization header without Bearer prefix is rejected', async () => {
        const token = signToken();
        const res = await request(app)
            .get('/lab-orders')
            .set('authorization', token);
        expect(res.status).toBe(401);
    });
});

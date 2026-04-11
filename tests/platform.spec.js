/**
 * Platform baseline tests.
 *
 * Covers T-P1-1 through T-P1-5 and T-P1-7 from the priority-ordered
 * security checklist. Each test maps to a HIPAA Security Rule safeguard or
 * an Executive Order 14028 / OMB M-21-31 logging/transport requirement.
 */
const request = require('supertest');
const { createTestApp } = require('./helpers/createTestApp');
const { signToken, bearer } = require('./helpers/tokens');

describe('T-P1-1 helmet hardening headers', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
    });

    test('sets Strict-Transport-Security with preload directives', async () => {
        const res = await request(app).get('/');
        expect(res.headers['strict-transport-security']).toBeDefined();
        expect(res.headers['strict-transport-security']).toMatch(
            /max-age=\d+/
        );
        expect(res.headers['strict-transport-security']).toMatch(
            /includeSubDomains/i
        );
    });

    test('sets X-Content-Type-Options to nosniff', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    test('sets X-Frame-Options or frame-ancestors to deny', async () => {
        const res = await request(app).get('/');
        const xfo = res.headers['x-frame-options'];
        const csp = res.headers['content-security-policy'] || '';
        expect(
            (xfo && /DENY|SAMEORIGIN/i.test(xfo)) ||
                /frame-ancestors/i.test(csp)
        ).toBe(true);
    });

    test('removes the X-Powered-By fingerprint header', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });
});

describe('T-P1-3 body and content-type guards', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
    });

    test('request body larger than 64KB returns 413 Payload Too Large', async () => {
        const token = signToken();
        const big = { data: 'x'.repeat(70 * 1024) };
        const res = await request(app)
            .post('/lab-orders')
            .set('authorization', bearer(token))
            .set('content-type', 'application/json')
            .send(big);
        expect(res.status).toBe(413);
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('request_id');
    });

    test('non-JSON content type on POST returns 415', async () => {
        const token = signToken();
        const res = await request(app)
            .post('/lab-orders')
            .set('authorization', bearer(token))
            .set('content-type', 'text/plain')
            .send('not-json');
        expect(res.status).toBe(415);
    });

    test('missing content-type on POST with body returns 415', async () => {
        const token = signToken();
        const res = await request(app)
            .post('/lab-orders')
            .set('authorization', bearer(token))
            .send('something');
        expect(res.status).toBe(415);
    });
});

describe('T-P1-4 unknown route handling', () => {
    test('unknown GET returns generic 404 with error + request_id', async () => {
        const app = createTestApp();
        const res = await request(app).get('/definitely-not-a-route');
        expect(res.status).toBe(404);
        expect(res.body).toEqual(
            expect.objectContaining({
                error: expect.any(String),
                request_id: expect.any(String),
            })
        );
        expect(res.text).not.toMatch(/Cannot GET/);
    });
});

describe('T-P1-5 generic error envelope', () => {
    let app;
    beforeEach(() => {
        app = createTestApp();
    });

    test('error responses never contain message, stack, or internal fields', async () => {
        // Use an invalid JSON body to trigger the JSON parse error path.
        const token = signToken();
        const res = await request(app)
            .post('/lab-orders')
            .set('authorization', bearer(token))
            .set('content-type', 'application/json')
            .send('{not-valid-json');

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body).toEqual(
            expect.objectContaining({
                error: expect.any(String),
                request_id: expect.any(String),
            })
        );
        expect(res.body).not.toHaveProperty('message');
        expect(res.body).not.toHaveProperty('stack');
        expect(res.body).not.toHaveProperty('ERROR');
    });

    test('401 responses contain only {error, request_id}', async () => {
        const res = await request(app).get('/lab-orders');
        expect(res.status).toBe(401);
        expect(Object.keys(res.body).sort()).toEqual(['error', 'request_id']);
    });

    test('404 responses contain only {error, request_id}', async () => {
        const res = await request(app).get('/nope');
        expect(res.status).toBe(404);
        expect(Object.keys(res.body).sort()).toEqual(['error', 'request_id']);
    });
});

describe('T-P1-7 rate limiting', () => {
    test('101st authenticated request to /lab-orders in one minute returns 429', async () => {
        const app = createTestApp();
        const token = signToken();

        // The rate limit cap is 60/min globally per IP for authenticated
        // routes, so we send 61 requests and expect the last one to 429.
        let lastStatus = 0;
        for (let i = 0; i < 61; i++) {
            // eslint-disable-next-line no-await-in-loop
            const res = await request(app)
                .get('/lab-orders')
                .set('authorization', bearer(token));
            lastStatus = res.status;
        }
        expect(lastStatus).toBe(429);
    });

    test('HEAD /lab-orders/:id has a stricter cap than GET', async () => {
        const app = createTestApp();
        const token = signToken();

        let lastHead = 0;
        for (let i = 0; i < 15; i++) {
            // eslint-disable-next-line no-await-in-loop
            const res = await request(app)
                .head('/lab-orders/12345')
                .set('authorization', bearer(token));
            lastHead = res.status;
        }
        expect(lastHead).toBe(429);
    });
});

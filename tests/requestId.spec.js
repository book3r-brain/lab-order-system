/**
 * T-P1-6 request-id correlation.
 *
 * Every response must carry an `X-Request-Id` header with a UUID v4 value;
 * the same id must appear in the structured log line emitted for that
 * request so that the SIEM can correlate HTTP traffic with audit events.
 */
const request = require('supertest');
const { createTestApp } = require('./helpers/createTestApp');
const { captureLogs } = require('./helpers/logCapture');

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('T-P1-6 X-Request-Id header and log correlation', () => {
    test('echoes a UUID v4 request id on every response', async () => {
        const app = createTestApp();
        const res = await request(app).get('/');
        expect(res.headers['x-request-id']).toMatch(UUID_V4);
    });

    test('different requests get different request ids', async () => {
        const app = createTestApp();
        const a = await request(app).get('/');
        const b = await request(app).get('/');
        expect(a.headers['x-request-id']).not.toEqual(
            b.headers['x-request-id']
        );
    });

    test('the request id appears in the log line for the request', async () => {
        const app = createTestApp();
        const capture = captureLogs();
        let headerId;
        try {
            const res = await request(app).get('/lab-orders');
            headerId = res.headers['x-request-id'];
        } finally {
            capture.stop();
        }
        const entries = capture.entries();
        const match = entries.find(
            (e) => e.request_id === headerId || (e.req && e.req.id === headerId)
        );
        expect(match).toBeDefined();
    });

    test('an inbound X-Request-Id is ignored in favor of a server-generated one', async () => {
        // Accepting client-supplied request ids is a common log-forging vector;
        // reject it to keep the log trail authoritative.
        const app = createTestApp();
        const res = await request(app)
            .get('/')
            .set('x-request-id', 'client-controlled-value');
        expect(res.headers['x-request-id']).not.toBe('client-controlled-value');
        expect(res.headers['x-request-id']).toMatch(UUID_V4);
    });
});

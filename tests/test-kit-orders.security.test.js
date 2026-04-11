const request = require('supertest');
const { createTestApp } = require('./helpers/create-test-app');
const {
    buildTestKitOrder,
    patientHeaders,
} = require('./helpers/fixtures');

describe('test kit order P1 security controls', () => {
    test('returns a redacted test kit order detail for non-privileged callers', async () => {
        const { app } = createTestApp({
            seed: {
                'test-kit-orders': {
                    'KIT-100': buildTestKitOrder(),
                },
            },
        });

        const response = await request(app)
            .get('/test-kit-orders/KIT-100')
            .set(patientHeaders());

        expect(response.status).toBe(200);
        expect(response.body['order-id']).toBe('KIT-100');
        expect(response.body).not.toHaveProperty('address1');
        expect(response.body).not.toHaveProperty('city');
        expect(response.body).not.toHaveProperty('tracking-num');
    });

    test('rate limits repeated test kit lookups', async () => {
        const { app } = createTestApp({
            seed: {
                'test-kit-orders': {
                    'KIT-100': buildTestKitOrder(),
                },
            },
        });

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await request(app)
                .get('/test-kit-orders/KIT-100')
                .set(patientHeaders({ 'x-request-id': `kit-probe-${attempt}` }));

            expect(response.status).toBe(200);
        }

        const limitedResponse = await request(app)
            .get('/test-kit-orders/KIT-100')
            .set(patientHeaders({ 'x-request-id': 'kit-probe-4' }));

        expect(limitedResponse.status).toBe(429);
    });

    test('soft deletes test kit orders and keeps a recoverable tombstone', async () => {
        const { app, auditLogger, db } = createTestApp({
            seed: {
                'test-kit-orders': {
                    'KIT-100': buildTestKitOrder(),
                },
            },
        });

        const response = await request(app)
            .delete('/test-kit-orders/KIT-100')
            .set(patientHeaders());

        expect(response.status).toBe(200);

        const stored = db.dumpCollection('test-kit-orders')['KIT-100'];
        expect(stored['deleted-at']).toBe('2026-04-11T10:00:00.000Z');
        expect(stored['deleted-by']).toBe('patient-123');
        expect(stored['retention-until']).toBe('2026-05-11T10:00:00.000Z');
        expect(auditLogger.entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    action: 'test-kit-order.delete',
                    resourceId: 'KIT-100',
                    success: true,
                }),
            ])
        );
    });

    test('rejects invalid test kit create and update payloads', async () => {
        const { app } = createTestApp({
            seed: {
                'test-kit-orders': {
                    'KIT-100': buildTestKitOrder(),
                },
            },
        });

        const invalidCreate = await request(app)
            .post('/test-kit-orders')
            .set(patientHeaders())
            .send(buildTestKitOrder({
                'order-id': 'KIT 100',
                'kit-id': 'bad kit id',
                status: 'bad/status',
            }));

        expect(invalidCreate.status).toBe(400);
        expect(invalidCreate.body.error).toMatch(/invalid/i);

        const invalidUpdate = await request(app)
            .post('/test-kit-orders/KIT-100')
            .set(patientHeaders({ 'x-request-id': 'kit-update-1' }))
            .send({
                'order-id': 'KIT-100',
                'customer-id': 'cust-123',
                'kit-id': 'bad kit id',
                status: 'bad/status',
            });

        expect(invalidUpdate.status).toBe(400);
        expect(invalidUpdate.body.error).toMatch(/invalid/i);
    });

    test('publishes minimized test kit events', async () => {
        const { app, published } = createTestApp();

        const response = await request(app)
            .post('/test-kit-orders')
            .set(patientHeaders())
            .send(buildTestKitOrder());

        expect(response.status).toBe(201);
        expect(published.testKitOrders).toHaveLength(1);
        expect(published.testKitOrders[0]).toEqual(
            expect.objectContaining({
                action: 'created',
                customerId: 'cust-123',
                resourceId: 'KIT-100',
                resourceType: 'test-kit-order',
            })
        );
        expect(published.testKitOrders[0]).not.toHaveProperty('address1');
        expect(published.testKitOrders[0]).not.toHaveProperty('city');
        expect(published.testKitOrders[0]).not.toHaveProperty('tracking-num');
    });
});

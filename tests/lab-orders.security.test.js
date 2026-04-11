const request = require('supertest');
const { createTestApp } = require('./helpers/create-test-app');
const {
    buildLabOrder,
    otherPatientHeaders,
    patientHeaders,
} = require('./helpers/fixtures');

describe('lab order P1 security controls', () => {
    test('returns only owned lab orders with pagination and summary fields', async () => {
        const { app } = createTestApp({
            seed: {
                'lab-orders': {
                    'LAB-100': buildLabOrder(),
                    'LAB-101': buildLabOrder({ 'order-id': 'LAB-101', 'ordered-date': '2026-04-09' }),
                    'LAB-999': buildLabOrder({ 'order-id': 'LAB-999', 'customer-id': 'cust-999' }),
                },
            },
        });

        const response = await request(app)
            .get('/lab-orders')
            .query({ page: '1', 'page-size': '1' })
            .set(patientHeaders());

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(2);
        expect(response.body.page).toBe(1);
        expect(response.body.pageSize).toBe(1);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]['customer-id']).toBe('cust-123');
        expect(response.body.data[0]).not.toHaveProperty('patient-dob');
        expect(response.body.data[0]).not.toHaveProperty('patient-ssn');
        expect(response.body.data[0]).not.toHaveProperty('diagnoses');
    });

    test('returns a redacted lab order detail for non-privileged callers', async () => {
        const { app } = createTestApp({
            seed: {
                'lab-orders': {
                    'LAB-100': buildLabOrder(),
                },
            },
        });

        const response = await request(app)
            .get('/lab-orders/LAB-100')
            .set(patientHeaders());

        expect(response.status).toBe(200);
        expect(response.body['order-id']).toBe('LAB-100');
        expect(response.body.status).toBe('Pending');
        expect(response.body).not.toHaveProperty('patient-dob');
        expect(response.body).not.toHaveProperty('patient-ssn');
        expect(response.body).not.toHaveProperty('patient-address');
        expect(response.body).not.toHaveProperty('diagnoses');
    });

    test('does not expose existence to unrelated callers via HEAD', async () => {
        const { app } = createTestApp({
            seed: {
                'lab-orders': {
                    'LAB-100': buildLabOrder(),
                },
            },
        });

        const response = await request(app)
            .head('/lab-orders/LAB-100')
            .set(otherPatientHeaders());

        expect(response.status).toBe(404);
    });

    test('rate limits repeated lab order probes', async () => {
        const { app } = createTestApp({
            seed: {
                'lab-orders': {
                    'LAB-100': buildLabOrder(),
                },
            },
        });

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await request(app)
                .get('/lab-orders/LAB-100')
                .set(patientHeaders({ 'x-request-id': `probe-${attempt}` }));

            expect(response.status).toBe(200);
        }

        const limitedResponse = await request(app)
            .get('/lab-orders/LAB-100')
            .set(patientHeaders({ 'x-request-id': 'probe-4' }));

        expect(limitedResponse.status).toBe(429);
    });

    test('soft deletes lab orders and keeps a recoverable tombstone', async () => {
        const { app, auditLogger, db } = createTestApp({
            seed: {
                'lab-orders': {
                    'LAB-100': buildLabOrder(),
                },
            },
        });

        const response = await request(app)
            .delete('/lab-orders/LAB-100')
            .set(patientHeaders());

        expect(response.status).toBe(200);

        const stored = db.dumpCollection('lab-orders')['LAB-100'];
        expect(stored['deleted-at']).toBe('2026-04-11T10:00:00.000Z');
        expect(stored['deleted-by']).toBe('patient-123');
        expect(stored['retention-until']).toBe('2026-05-11T10:00:00.000Z');

        const hiddenResponse = await request(app)
            .get('/lab-orders/LAB-100')
            .set(patientHeaders({ 'x-request-id': 'req-owner-3' }));

        expect(hiddenResponse.status).toBe(404);
        expect(auditLogger.entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    action: 'lab-order.delete',
                    resourceId: 'LAB-100',
                    success: true,
                }),
            ])
        );
    });

    test('rejects invalid lab order create and update payloads', async () => {
        const { app } = createTestApp({
            seed: {
                'lab-orders': {
                    'LAB-100': buildLabOrder(),
                },
            },
        });

        const invalidCreate = await request(app)
            .post('/lab-orders')
            .set(patientHeaders())
            .send(buildLabOrder({
                'order-id': 'BAD ID',
                'patient-dob': '01/01/1990',
                'patient-ssn': '111223333',
                status: 'bad/status',
            }));

        expect(invalidCreate.status).toBe(400);
        expect(invalidCreate.body.error).toMatch(/invalid/i);

        const invalidUpdate = await request(app)
            .put('/lab-orders/LAB-100')
            .set(patientHeaders({ 'x-request-id': 'req-owner-4' }))
            .send(buildLabOrder({
                status: 'bad/status',
            }));

        expect(invalidUpdate.status).toBe(400);
        expect(invalidUpdate.body.error).toMatch(/invalid/i);
    });

    test('publishes minimized lab order events', async () => {
        const { app, published } = createTestApp();

        const response = await request(app)
            .post('/lab-orders')
            .set(patientHeaders())
            .send(buildLabOrder());

        expect(response.status).toBe(201);
        expect(published.labOrders).toHaveLength(1);
        expect(published.labOrders[0]).toEqual(
            expect.objectContaining({
                action: 'created',
                customerId: 'cust-123',
                resourceId: 'LAB-100',
                resourceType: 'lab-order',
            })
        );
        expect(published.labOrders[0]).not.toHaveProperty('patient-dob');
        expect(published.labOrders[0]).not.toHaveProperty('patient-ssn');
        expect(published.labOrders[0]).not.toHaveProperty('patient-address');
        expect(published.labOrders[0]).not.toHaveProperty('diagnoses');
    });
});

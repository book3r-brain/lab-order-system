const request = require('supertest');
const { createTestApp } = require('./helpers/create-test-app');
const {
    buildLabOrder,
    patientHeaders,
} = require('./helpers/fixtures');

describe('audit logging compliance controls', () => {
    test('emits redacted audit events for create, read, update, delete, and webhook ingest', async () => {
        const { app, auditLogger } = createTestApp({
            seed: {
                'lab-orders': {
                    'LAB-100': buildLabOrder(),
                },
            },
        });

        const createResponse = await request(app)
            .post('/lab-orders')
            .set(patientHeaders())
            .send(buildLabOrder({ 'order-id': 'LAB-200', 'correlation-id': 'corr-200' }));

        expect(createResponse.status).toBe(201);

        const readResponse = await request(app)
            .get('/lab-orders/LAB-100')
            .set(patientHeaders({ 'x-request-id': 'audit-read' }));

        expect(readResponse.status).toBe(200);

        const updateResponse = await request(app)
            .put('/lab-orders/LAB-100')
            .set(patientHeaders({ 'x-request-id': 'audit-update' }))
            .send(buildLabOrder({ status: 'Processing' }));

        expect(updateResponse.status).toBe(201);

        const deleteResponse = await request(app)
            .delete('/lab-orders/LAB-100')
            .set(patientHeaders({ 'x-request-id': 'audit-delete' }));

        expect(deleteResponse.status).toBe(200);

        const webhookResponse = await request(app)
            .post('/webhooks/orders/create')
            .send({
                id: 2001,
                email: 'owner@example.com',
                patient_dob: '1990-01-01',
                shipping_address: {
                    address1: '123 Main St',
                },
            });

        expect(webhookResponse.status).toBe(200);

        expect(auditLogger.entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ action: 'lab-order.create', resourceId: 'LAB-200', success: true }),
                expect.objectContaining({ action: 'lab-order.read', resourceId: 'LAB-100', success: true }),
                expect.objectContaining({ action: 'lab-order.update', resourceId: 'LAB-100', success: true }),
                expect.objectContaining({ action: 'lab-order.delete', resourceId: 'LAB-100', success: true }),
                expect.objectContaining({ action: 'webhook.order.ingest', resourceId: '2001', success: true }),
            ])
        );

        auditLogger.entries.forEach((entry) => {
            expect(entry).toEqual(
                expect.objectContaining({
                    endpoint: expect.any(String),
                    ip: expect.any(String),
                    resourceId: expect.any(String),
                    success: expect.any(Boolean),
                    timestamp: expect.any(String),
                    user: expect.any(String),
                })
            );
        });

        const serializedAudit = JSON.stringify(auditLogger.entries);
        expect(serializedAudit).not.toContain('owner@example.com');
        expect(serializedAudit).not.toContain('1990-01-01');
        expect(serializedAudit).not.toContain('123 Main St');
        expect(serializedAudit).not.toContain('111-22-3333');
        expect(serializedAudit).not.toContain('Routine monitoring');
    });
});

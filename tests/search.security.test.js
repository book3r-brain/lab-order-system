const request = require('supertest');
const { createTestApp } = require('./helpers/create-test-app');
const {
    buildCustomerRecord,
    buildShopifyOrder,
    patientHeaders,
} = require('./helpers/fixtures');

describe('search and enumeration protections', () => {
    test('prevents arbitrary order email enumeration', async () => {
        const { app } = createTestApp({
            seed: {
                orders: {
                    '2001': buildShopifyOrder(),
                    '2002': buildShopifyOrder({ id: 2002, email: 'victim@example.com' }),
                },
            },
        });

        const response = await request(app)
            .post('/orders')
            .set(patientHeaders())
            .send({ email: 'victim@example.com' });

        expect(response.status).toBe(403);
    });

    test('prevents arbitrary customer email enumeration', async () => {
        const { app } = createTestApp({
            seed: {
                customers: {
                    '3001': buildCustomerRecord(),
                    '3002': buildCustomerRecord({ id: 3002, email: 'victim@example.com' }),
                },
            },
        });

        const response = await request(app)
            .post('/customers')
            .set(patientHeaders())
            .send({ email: 'victim@example.com' });

        expect(response.status).toBe(403);
    });

    test('rate limits repeated order email probes', async () => {
        const { app } = createTestApp({
            seed: {
                orders: {
                    '2001': buildShopifyOrder(),
                },
            },
        });

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await request(app)
                .post('/orders')
                .set(patientHeaders({ 'x-request-id': `orders-${attempt}` }))
                .send({ email: 'owner@example.com' });

            expect(response.status).toBe(200);
        }

        const limitedResponse = await request(app)
            .post('/orders')
            .set(patientHeaders({ 'x-request-id': 'orders-4' }))
            .send({ email: 'owner@example.com' });

        expect(limitedResponse.status).toBe(429);
    });

    test('rate limits repeated customer email probes', async () => {
        const { app } = createTestApp({
            seed: {
                customers: {
                    '3001': buildCustomerRecord(),
                },
            },
        });

        for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await request(app)
                .post('/customers')
                .set(patientHeaders({ 'x-request-id': `customers-${attempt}` }))
                .send({ email: 'owner@example.com' });

            expect(response.status).toBe(200);
        }

        const limitedResponse = await request(app)
            .post('/customers')
            .set(patientHeaders({ 'x-request-id': 'customers-4' }))
            .send({ email: 'owner@example.com' });

        expect(limitedResponse.status).toBe(429);
    });

    test('validates email format for order and customer searches', async () => {
        const { app } = createTestApp();

        const invalidOrderSearch = await request(app)
            .post('/orders')
            .set(patientHeaders())
            .send({ email: 'not-an-email' });

        expect(invalidOrderSearch.status).toBe(400);

        const invalidCustomerSearch = await request(app)
            .post('/customers')
            .set(patientHeaders({ 'x-request-id': 'customers-invalid' }))
            .send({ email: 'not-an-email' });

        expect(invalidCustomerSearch.status).toBe(400);
    });

    test('returns paginated minimal results for the authenticated email owner', async () => {
        const { app } = createTestApp({
            seed: {
                orders: {
                    '2001': buildShopifyOrder(),
                    '2003': buildShopifyOrder({ id: 2003 }),
                },
                customers: {
                    '3001': buildCustomerRecord(),
                    '3003': buildCustomerRecord({ id: 3003 }),
                },
            },
        });

        const orderResponse = await request(app)
            .post('/orders')
            .set(patientHeaders())
            .send({ email: 'owner@example.com', page: 1, 'page-size': 1 });

        expect(orderResponse.status).toBe(200);
        expect(orderResponse.body.total).toBe(2);
        expect(orderResponse.body.data).toHaveLength(1);
        expect(orderResponse.body.data[0]).not.toHaveProperty('shipping_address');

        const customerResponse = await request(app)
            .post('/customers')
            .set(patientHeaders({ 'x-request-id': 'customers-owner' }))
            .send({ email: 'owner@example.com', page: 1, 'page-size': 1 });

        expect(customerResponse.status).toBe(200);
        expect(customerResponse.body.total).toBe(2);
        expect(customerResponse.body.data).toHaveLength(1);
        expect(customerResponse.body.data[0]).not.toHaveProperty('phone');
    });
});

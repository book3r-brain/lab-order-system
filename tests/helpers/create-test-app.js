const { createApp } = require('../../src/app');
const { createMockFirestore } = require('./mock-firestore');

function createTestApp({ seed = {}, rateLimitConfig = {} } = {}) {
    const db = createMockFirestore(seed);
    const entries = [];
    const auditLogger = {
        entries,
        log: jest.fn((event) => {
            entries.push(JSON.parse(JSON.stringify(event)));
        }),
    };

    const published = {
        labOrders: [],
        testKitOrders: [],
    };

    const app = createApp({
        auditLogger,
        clock: () => new Date('2026-04-11T10:00:00.000Z'),
        db,
        publishLabOrderMessage: jest.fn(async (payload) => {
            published.labOrders.push(payload);
            return 'lab-message-1';
        }),
        publishTestKitMessage: jest.fn(async (payload) => {
            published.testKitOrders.push(payload);
            return 'kit-message-1';
        }),
        rateLimitConfig,
    });

    return {
        app,
        auditLogger,
        db,
        published,
    };
}

module.exports = {
    createTestApp,
};

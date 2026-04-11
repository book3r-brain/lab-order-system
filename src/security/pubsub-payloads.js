function buildLabOrderEvent(action, record, now) {
    return {
        action,
        customerId: record['customer-id'],
        occurredAt: now.toISOString(),
        resourceId: record['order-id'],
        resourceType: 'lab-order',
        correlationId: record['correlation-id'] || null,
    };
}

function buildTestKitOrderEvent(action, record, now) {
    return {
        action,
        customerId: record['customer-id'],
        occurredAt: now.toISOString(),
        resourceId: record['order-id'],
        resourceType: 'test-kit-order',
        kitId: record['kit-id'] || null,
    };
}

module.exports = {
    buildLabOrderEvent,
    buildTestKitOrderEvent,
};

function cloneWithoutSoftDelete(record) {
    const sanitized = { ...record };
    delete sanitized['deleted-at'];
    delete sanitized['deleted-by'];
    delete sanitized['retention-until'];
    return sanitized;
}

function pick(record, fields) {
    return fields.reduce((result, field) => {
        if (record[field] !== undefined) {
            result[field] = record[field];
        }

        return result;
    }, {});
}

function redactLabOrder(record, privileged) {
    const sanitized = cloneWithoutSoftDelete(record);

    if (privileged) {
        return sanitized;
    }

    return pick(sanitized, [
        'order-id',
        'customer-id',
        'status',
        'ordered-date',
        'test-ordered',
        'correlation-id',
    ]);
}

function redactTestKitOrder(record, privileged) {
    const sanitized = cloneWithoutSoftDelete(record);

    if (privileged) {
        return sanitized;
    }

    return pick(sanitized, [
        'order-id',
        'customer-id',
        'kit-id',
        'status',
        'processing-status',
    ]);
}

function redactShopifyOrder(record) {
    return pick(record, [
        'id',
        'created_at',
        'currency',
        'financial_status',
        'total_price',
    ]);
}

function redactCustomer(record) {
    return pick(record, [
        'id',
        'firstName',
        'first_name',
        'lastName',
        'last_name',
    ]);
}

module.exports = {
    redactCustomer,
    redactLabOrder,
    redactShopifyOrder,
    redactTestKitOrder,
};

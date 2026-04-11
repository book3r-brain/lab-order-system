function patientHeaders(overrides = {}) {
    return {
        'x-actor-id': 'patient-123',
        'x-actor-role': 'patient',
        'x-customer-id': 'cust-123',
        'x-actor-email': 'owner@example.com',
        'x-request-id': 'req-owner-1',
        ...overrides,
    };
}

function otherPatientHeaders(overrides = {}) {
    return patientHeaders({
        'x-actor-id': 'patient-999',
        'x-customer-id': 'cust-999',
        'x-actor-email': 'other@example.com',
        'x-request-id': 'req-owner-2',
        ...overrides,
    });
}

function serviceHeaders(overrides = {}) {
    return {
        'x-actor-id': 'svc-broker',
        'x-actor-role': 'service',
        'x-request-id': 'req-service-1',
        ...overrides,
    };
}

function buildLabOrder(overrides = {}) {
    return {
        'order-id': 'LAB-100',
        'customer-id': 'cust-123',
        'patient-fname': 'Jane',
        'patient-lname': 'Doe',
        'patient-dob': '1990-01-01',
        'patient-ssn': '111-22-3333',
        'patient-address': '123 Main St',
        'patient-city': 'Austin',
        'patient-state': 'TX',
        'patient-zip': '78701',
        'patient-phday': '555-123-4567',
        'test-ordered': 'Hormone Panel',
        'diagnoses': 'Routine monitoring',
        'ordered-date': '2026-04-10',
        'status': 'Pending',
        'tracking-num': 'TRACK-123',
        'correlation-id': 'corr-100',
        ...overrides,
    };
}

function buildTestKitOrder(overrides = {}) {
    return {
        'order-id': 'KIT-100',
        'customer-id': 'cust-123',
        'clinic-name': 'Security Clinic',
        'address1': '123 Main St',
        'city': 'Austin',
        'state': 'TX',
        'zip': '78701',
        'country': 'US',
        'shipping-method': 'Ground',
        'tracking-num': 'KITTRACK-123',
        'status': 'New',
        'comment': 'Sample kit order',
        'kit-id': 'KIT-ABC-123',
        ...overrides,
    };
}

function buildShopifyOrder(overrides = {}) {
    return {
        id: 2001,
        email: 'owner@example.com',
        created_at: '2026-04-10T10:00:00Z',
        total_price: '189.00',
        currency: 'USD',
        financial_status: 'paid',
        shipping_address: {
            address1: '123 Main St',
            city: 'Austin',
            province_code: 'TX',
            zip: '78701',
        },
        line_items: [
            {
                id: 1,
                title: 'Hormone Panel',
                quantity: 1,
            },
        ],
        ...overrides,
    };
}

function buildCustomerRecord(overrides = {}) {
    return {
        id: 3001,
        email: 'owner@example.com',
        firstName: 'Jordan',
        lastName: 'Tester',
        phone: '555-123-4567',
        ...overrides,
    };
}

module.exports = {
    buildCustomerRecord,
    buildLabOrder,
    buildShopifyOrder,
    buildTestKitOrder,
    otherPatientHeaders,
    patientHeaders,
    serviceHeaders,
};

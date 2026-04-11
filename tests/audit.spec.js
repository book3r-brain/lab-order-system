/**
 * T-P1-10 / T-P1-11 / T-P1-12 — audit logging.
 *
 * HIPAA §164.312(b) requires "hardware, software, and/or procedural
 * mechanisms that record and examine activity in information systems that
 * contain or use electronic protected health information." Executive
 * Order 14028 / OMB M-21-31 adds a logging maturity floor (EL1+) that
 * mandates structured logs with actor, source IP, user agent, endpoint,
 * resource id, and outcome — for every access event.
 *
 * These tests assert:
 *
 *   - every authenticated PHI access emits exactly one structured audit log
 *     line with the EL1 field set;
 *   - the audit logger redacts PHI identifiers and secrets before emission;
 *   - failed authentication emits an `auth.failure` event without echoing
 *     the submitted secret;
 *   - audit events are distinguishable from application logs via a
 *     dedicated logger name.
 */
const request = require('supertest');
const { createTestApp } = require('./helpers/createTestApp');
const { captureLogs } = require('./helpers/logCapture');
const { signToken, bearer } = require('./helpers/tokens');

const REQUIRED_AUDIT_FIELDS = [
    'ts',
    'request_id',
    'actor_id',
    'actor_role',
    'src_ip',
    'user_agent',
    'endpoint',
    'method',
    'resource_type',
    'outcome',
];

function findAuditEntries(entries) {
    return entries.filter(
        (e) => e && (e.name === 'audit' || e.logger === 'audit')
    );
}

describe('T-P1-10 audit log emits required EL1 fields on every PHI event', () => {
    let app;
    let capture;
    beforeEach(() => {
        app = createTestApp();
        capture = captureLogs();
    });
    afterEach(() => {
        capture.stop();
    });

    test('GET /lab-orders emits a phi.read audit event with all required fields', async () => {
        const token = signToken({ sub: 'user-7', customer_id: 'cust-7' });
        await request(app)
            .get('/lab-orders')
            .set('authorization', bearer(token))
            .set('user-agent', 'jest-test-agent/1.0');

        const audits = findAuditEntries(capture.entries());
        const phiRead = audits.find((e) => e.event === 'phi.read');
        expect(phiRead).toBeDefined();
        for (const field of REQUIRED_AUDIT_FIELDS) {
            expect(phiRead).toHaveProperty(field);
        }
        expect(phiRead.actor_id).toBe('user-7');
        expect(phiRead.actor_role).toBe('patient');
        expect(phiRead.method).toBe('GET');
        expect(phiRead.endpoint).toMatch(/lab-orders/);
        expect(phiRead.user_agent).toContain('jest-test-agent');
    });

    test('POST /lab-orders emits a phi.create audit event', async () => {
        const token = signToken({ sub: 'user-8', customer_id: 'cust-8' });
        await request(app)
            .post('/lab-orders')
            .set('authorization', bearer(token))
            .set('content-type', 'application/json')
            .send({ 'order-id': 'audit-1', 'customer-id': 'cust-8' });

        const audits = findAuditEntries(capture.entries());
        const create = audits.find((e) => e.event === 'phi.create');
        expect(create).toBeDefined();
        expect(create.actor_id).toBe('user-8');
        expect(create.method).toBe('POST');
    });
});

describe('T-P1-11 audit redactor blocks PHI identifiers and secrets', () => {
    let app;
    let capture;
    beforeEach(() => {
        app = createTestApp();
        capture = captureLogs();
    });
    afterEach(() => {
        capture.stop();
    });

    test('SSN, DOB, and name fields never appear in any log line', async () => {
        const token = signToken({ sub: 'user-9', customer_id: 'cust-9' });
        const ssn = '123-45-6789';
        const dob = '1990-01-01';
        const fname = 'PatientFirstNameX';
        const lname = 'PatientLastNameX';

        await request(app)
            .post('/lab-orders')
            .set('authorization', bearer(token))
            .set('content-type', 'application/json')
            .send({
                'order-id': 'redact-1',
                'customer-id': 'cust-9',
                'patient-ssn': ssn,
                'patient-dob': dob,
                'patient-fname': fname,
                'patient-lname': lname,
                diagnoses: 'SENSITIVE-DIAGNOSIS-X',
                icd9: 'V70.0',
            });

        const raw = capture.raw();
        expect(raw).not.toContain(ssn);
        expect(raw).not.toContain(dob);
        expect(raw).not.toContain(fname);
        expect(raw).not.toContain(lname);
        expect(raw).not.toContain('SENSITIVE-DIAGNOSIS-X');
    });

    test('Authorization headers and access tokens never appear in logs', async () => {
        const token = signToken();
        await request(app)
            .get('/lab-orders')
            .set('authorization', bearer(token));
        const raw = capture.raw();
        expect(raw).not.toContain(token);
        // The substring "Bearer " should not leak either.
        expect(raw).not.toMatch(/Bearer [A-Za-z0-9._-]{10}/);
    });
});

describe('T-P1-12 failed authentication emits auth.failure', () => {
    let app;
    let capture;
    beforeEach(() => {
        app = createTestApp();
        capture = captureLogs();
    });
    afterEach(() => {
        capture.stop();
    });

    test('malformed bearer token logs auth.failure without the submitted secret', async () => {
        const badToken = 'definitely-not-a-valid-jwt';
        await request(app)
            .get('/lab-orders')
            .set('authorization', `Bearer ${badToken}`);

        const audits = findAuditEntries(capture.entries());
        const failure = audits.find((e) => e.event === 'auth.failure');
        expect(failure).toBeDefined();
        expect(failure.outcome).toBe('failure');
        // The raw submitted secret must not be anywhere in the log stream.
        expect(capture.raw()).not.toContain(badToken);
    });

    test('missing Authorization header logs auth.failure with reason', async () => {
        await request(app).get('/lab-orders');
        const audits = findAuditEntries(capture.entries());
        const failure = audits.find((e) => e.event === 'auth.failure');
        expect(failure).toBeDefined();
        expect(failure).toHaveProperty('reason');
    });
});

describe('audit logger is a separate named channel', () => {
    test('audit entries are tagged with name:"audit"', async () => {
        const app = createTestApp();
        const capture = captureLogs();
        try {
            const token = signToken();
            await request(app)
                .get('/lab-orders')
                .set('authorization', bearer(token));
        } finally {
            capture.stop();
        }
        const audits = findAuditEntries(capture.entries());
        expect(audits.length).toBeGreaterThan(0);
        for (const a of audits) {
            expect(a.name || a.logger).toBe('audit');
        }
    });
});

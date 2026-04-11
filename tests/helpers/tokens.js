/**
 * JWT helpers for the test suite.
 *
 * The production `requireAuth` middleware validates tokens against
 * `JWT_SECRET`, `JWT_ISSUER`, and `JWT_AUDIENCE` using HS256. For P1 we
 * deliberately use a symmetric secret to keep the test matrix small; the
 * asymmetric JWKS flow is a P3 follow-up once a real gateway is wired in.
 */
const jwt = require('jsonwebtoken');

function signToken(overrides = {}) {
    const payload = {
        sub: overrides.sub || 'user-test-1',
        role: overrides.role || 'patient',
        customer_id: overrides.customer_id || 'cust-test-1',
        ...overrides.claims,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        issuer: overrides.issuer || process.env.JWT_ISSUER,
        audience: overrides.audience || process.env.JWT_AUDIENCE,
        expiresIn: overrides.expiresIn || '10m',
    });
}

function signExpiredToken() {
    return jwt.sign(
        { sub: 'user-test-expired', role: 'patient', customer_id: 'cust-1' },
        process.env.JWT_SECRET,
        {
            algorithm: 'HS256',
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
            expiresIn: '-1m',
        }
    );
}

function signWrongIssuerToken() {
    return jwt.sign(
        { sub: 'user-test-wrong-iss', role: 'patient', customer_id: 'cust-1' },
        process.env.JWT_SECRET,
        {
            algorithm: 'HS256',
            issuer: 'https://evil.example.com/',
            audience: process.env.JWT_AUDIENCE,
            expiresIn: '10m',
        }
    );
}

function signWithWrongSecret() {
    return jwt.sign(
        { sub: 'user-test-wrong-secret', role: 'patient', customer_id: 'cust-1' },
        'not-the-real-secret',
        {
            algorithm: 'HS256',
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
            expiresIn: '10m',
        }
    );
}

function bearer(token) {
    return `Bearer ${token}`;
}

module.exports = {
    signToken,
    signExpiredToken,
    signWrongIssuerToken,
    signWithWrongSecret,
    bearer,
};

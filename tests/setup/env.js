/**
 * Seeded environment for every test run.
 *
 * The production `src/config` module will refuse to boot unless these are
 * present (T-P1-14). Individual tests may override specific values with
 * `jest.isolateModules` + `delete process.env.X` to exercise failure paths.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
// Quiet the application request logger during tests so the log capture
// helper only sees structured events we explicitly emit. The audit logger
// stays at `info` because tests need to assert on it.
process.env.LOG_LEVEL = 'warn';
process.env.GCP_PROJECT = 'lab-order-test';
process.env.SHOPIFY_SHOP = 'lab-order-test';
process.env.SHOPIFY_CLIENT_ID = 'test-client-id';
process.env.SHOPIFY_CLIENT_SECRET = 'test-client-secret';
process.env.SHOPIFY_API_WEBHOOK = 'test-webhook-secret';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_ISSUER = 'https://test-issuer.example.com/';
process.env.JWT_AUDIENCE = 'lab-order-system-test';
process.env.KMS_KEY_NAME =
    'projects/lab-order-test/locations/global/keyRings/test/cryptoKeys/phi';
process.env.CORS_ALLOWED_ORIGINS = 'https://app.test.example.com';
process.env.CLINIC_PRACT_ID = 'TEST-PRACT';
process.env.LOC_POS = 'TEST-LOC';
process.env.ORDER_TAKER = 'test-taker';
process.env.NAME_OF_REQUESTOR = 'TEST-';
process.env.REQ_LOC = 'TEST-REQ';
process.env.STATUS = 'NEW';

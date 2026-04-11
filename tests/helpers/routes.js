/**
 * Canonical list of authenticated routes exposed by the middleware.
 *
 * Tests that need to assert behaviour across every route (e.g. "every
 * endpoint returns 401 without a token") parametrize over this table.
 *
 * The `webhooks/*` routes are deliberately excluded because they use HMAC
 * signing from Shopify rather than a JWT bearer token (D-P1-6).
 */
const AUTHED_ROUTES = [
    { method: 'post', path: '/lab-orders', body: {} },
    { method: 'get', path: '/lab-orders' },
    { method: 'get', path: '/lab-orders/12345' },
    { method: 'put', path: '/lab-orders/12345', body: {} },
    { method: 'head', path: '/lab-orders/12345' },
    { method: 'delete', path: '/lab-orders/12345' },
    { method: 'post', path: '/test-kit-orders', body: {} },
    { method: 'get', path: '/test-kit-orders/12345' },
    { method: 'post', path: '/test-kit-orders/12345', body: {} },
    { method: 'delete', path: '/test-kit-orders/12345' },
    { method: 'get', path: '/orders/12345' },
    { method: 'post', path: '/orders', body: { email: 'test@example.com' } },
    { method: 'get', path: '/customers/12345' },
    { method: 'post', path: '/customers', body: { email: 'test@example.com' } },
    { method: 'post', path: '/customers/create', body: { email: 'test@example.com' } },
    { method: 'get', path: '/shopify-orders/token' },
    { method: 'get', path: '/shopify-orders/12345' },
    { method: 'post', path: '/shopify-orders/12345', body: {} },
];

const UNAUTHED_ROUTES = [
    { method: 'get', path: '/' }, // welcome page
    { method: 'post', path: '/webhooks/orders/create', body: {} },
    { method: 'post', path: '/webhooks/customers/create', body: {} },
];

module.exports = { AUTHED_ROUTES, UNAUTHED_ROUTES };

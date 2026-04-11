/**
 * Jest configuration for the lab-order-system security test suite.
 *
 * Tests are organized under ./tests and rely on a shared setup file that
 * stubs external clients (Firestore, Pub/Sub) and seeds the environment
 * with values that the `src/config` module will accept.
 */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.spec.js'],
    setupFiles: ['<rootDir>/tests/setup/env.js'],
    clearMocks: true,
    resetModules: true,
    verbose: false,
    testTimeout: 15000,
};

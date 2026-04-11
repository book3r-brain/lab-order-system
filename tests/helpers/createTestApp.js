/**
 * Test app factory.
 *
 * Loads the app with the test environment already seeded by
 * `tests/setup/env.js`. Every test that needs to exercise HTTP behaviour
 * should call this helper rather than importing `src/index.js` directly —
 * `src/index.js` binds to a port and is not reusable between tests.
 *
 * The factory also isolates module state so that supertests do not share
 * rate-limit counters or pino transports across suites.
 */
function createTestApp(envOverrides = {}) {
    const saved = {};
    for (const [key, value] of Object.entries(envOverrides)) {
        saved[key] = process.env[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    let app;
    jest.isolateModules(() => {
        // eslint-disable-next-line global-require
        const createApp = require('../../src/app');
        app = createApp();
    });

    // Restore the env so later tests get the baseline again.
    for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    return app;
}

module.exports = { createTestApp };

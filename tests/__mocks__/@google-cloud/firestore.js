/**
 * In-memory stub for @google-cloud/firestore.
 *
 * The P1 tests never assert on Firestore behaviour directly; they only need
 * the client to construct cleanly and to return empty result sets so handlers
 * do not throw when the app is booted without a real Firestore backend.
 *
 * P2/P3 tests will introduce a richer emulator-style stub; keep this one
 * deliberately minimal so tests remain fast and deterministic.
 */
const emptySnapshot = {
    empty: true,
    size: 0,
    docs: [],
    forEach() {},
};

function makeDocRef() {
    return {
        id: 'mock-doc-id',
        get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }),
        set: jest.fn().mockResolvedValue({ writeTime: {} }),
        create: jest.fn().mockResolvedValue({ writeTime: {} }),
        update: jest.fn().mockResolvedValue({ writeTime: {} }),
        delete: jest.fn().mockResolvedValue({ writeTime: {} }),
    };
}

function makeCollection() {
    const ref = {
        doc: jest.fn(() => makeDocRef()),
        where: jest.fn(() => ref),
        get: jest.fn().mockResolvedValue(emptySnapshot),
        add: jest.fn().mockResolvedValue(makeDocRef()),
    };
    return ref;
}

class Firestore {
    constructor() {
        this.settings = jest.fn();
    }
    collection() {
        return makeCollection();
    }
}

module.exports = Firestore;
module.exports.Firestore = Firestore;

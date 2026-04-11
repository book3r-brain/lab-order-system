function clone(value) {
    if (value === undefined) {
        return undefined;
    }

    return JSON.parse(JSON.stringify(value));
}

class MockDocumentSnapshot {
    constructor(id, data) {
        this.id = id;
        this._data = clone(data);
        this.exists = data !== undefined;
    }

    data() {
        return clone(this._data);
    }
}

class MockQuerySnapshot {
    constructor(docs) {
        this.docs = docs;
        this.size = docs.length;
        this.empty = docs.length === 0;
    }

    forEach(callback) {
        this.docs.forEach(callback);
    }
}

function createMockFirestore(seed = {}) {
    const store = new Map();

    Object.entries(seed).forEach(([collectionName, documents]) => {
        store.set(
            collectionName,
            new Map(
                Object.entries(documents).map(([id, data]) => [String(id), clone(data)])
            )
        );
    });

    function getCollectionStore(name) {
        if (!store.has(name)) {
            store.set(name, new Map());
        }

        return store.get(name);
    }

    return {
        collection(name) {
            const collectionStore = getCollectionStore(name);

            return {
                doc(id) {
                    const key = String(id);

                    return {
                        async set(data) {
                            collectionStore.set(key, clone(data));
                        },
                        async update(patch) {
                            if (!collectionStore.has(key)) {
                                throw new Error('Document does not exist');
                            }

                            const current = collectionStore.get(key);
                            collectionStore.set(key, { ...current, ...clone(patch) });
                        },
                        async get() {
                            const data = collectionStore.get(key);
                            return new MockDocumentSnapshot(key, data);
                        },
                        async delete() {
                            const existed = collectionStore.delete(key);
                            return { existed };
                        },
                    };
                },
                where(field, operator, value) {
                    if (operator !== '==') {
                        throw new Error(`Unsupported operator: ${operator}`);
                    }

                    return {
                        async get() {
                            const docs = [];

                            collectionStore.forEach((data, id) => {
                                if (data && data[field] === value) {
                                    docs.push(new MockDocumentSnapshot(id, data));
                                }
                            });

                            return new MockQuerySnapshot(docs);
                        },
                    };
                },
                async get() {
                    const docs = [];

                    collectionStore.forEach((data, id) => {
                        docs.push(new MockDocumentSnapshot(id, data));
                    });

                    return new MockQuerySnapshot(docs);
                },
            };
        },
        dumpCollection(name) {
            const collectionStore = getCollectionStore(name);
            return Object.fromEntries(
                Array.from(collectionStore.entries()).map(([id, data]) => [id, clone(data)])
            );
        },
    };
}

module.exports = {
    createMockFirestore,
};

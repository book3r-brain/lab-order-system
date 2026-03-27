const db = require('../database');

class LabOrderRepository {
    constructor(firestore) {
        this.db = firestore;
        this.collection = this.db.collection('lab-orders');
    }

    assertActorId(actorId) {
        if (!actorId || typeof actorId !== 'string' || !actorId.trim()) {
            const error = new Error('Authenticated actor id is required.');
            error.status = 401;
            error.code = 'ACTOR_ID_REQUIRED';
            throw error;
        }
    }

    createActorScopedQuery(actorId) {
        this.assertActorId(actorId);
        return this.collection.where('customer-id', '==', actorId.trim());
    }

    async create(actorId, data) {
        const scopedActorId = actorId.trim();
        const orderId = String(data['order-id']);
        const persistedData = {
            ...data,
            'order-id': orderId,
            'customer-id': scopedActorId,
        };

        return this.db.runTransaction(async (transaction) => {
            const documentRef = this.collection.doc(orderId);
            const existingDocument = await transaction.get(documentRef);

            if (existingDocument.exists) {
                const existingData = existingDocument.data();
                if (existingData['customer-id'] !== scopedActorId) {
                    const error = new Error('Lab order already exists for a different actor.');
                    error.status = 409;
                    error.code = 'LAB_ORDER_CONFLICT';
                    throw error;
                }
            }

            transaction.set(documentRef, persistedData);
            return persistedData;
        });
    }

    async listByActor(actorId) {
        const snapshot = await this.createActorScopedQuery(actorId).get();
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ref: doc.ref,
            data: doc.data(),
        }));
    }

    async getById(actorId, orderId) {
        const snapshot = await this.createActorScopedQuery(actorId)
            .where('order-id', '==', String(orderId))
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const document = snapshot.docs[0];
        return {
            id: document.id,
            ref: document.ref,
            data: document.data(),
        };
    }

    async exists(actorId, orderId) {
        const record = await this.getById(actorId, orderId);
        return Boolean(record);
    }

    async update(actorId, orderId, data) {
        const scopedActorId = actorId.trim();
        const scopedOrderId = String(orderId);

        return this.db.runTransaction(async (transaction) => {
            const querySnapshot = await transaction.get(
                this.createActorScopedQuery(scopedActorId)
                    .where('order-id', '==', scopedOrderId)
                    .limit(1)
            );

            if (querySnapshot.empty) {
                return null;
            }

            const document = querySnapshot.docs[0];
            const nextData = {
                ...document.data(),
                ...data,
                'order-id': scopedOrderId,
                'customer-id': scopedActorId,
            };

            transaction.set(document.ref, nextData);

            return {
                id: document.id,
                ref: document.ref,
                data: nextData,
            };
        });
    }

    async delete(actorId, orderId) {
        const scopedOrderId = String(orderId);
        const scopedActorId = actorId.trim();

        return this.db.runTransaction(async (transaction) => {
            const querySnapshot = await transaction.get(
                this.createActorScopedQuery(scopedActorId)
                    .where('order-id', '==', scopedOrderId)
                    .limit(1)
            );

            if (querySnapshot.empty) {
                return false;
            }

            transaction.delete(querySnapshot.docs[0].ref);
            return true;
        });
    }
}

module.exports = new LabOrderRepository(db);

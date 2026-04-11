/**
 * In-memory stub for @google-cloud/pubsub.
 *
 * Every publish returns a deterministic message id so tests can assert on the
 * value without needing a real topic.
 */
class Topic {
    publish() {
        return Promise.resolve('mock-message-id');
    }
}

class PubSub {
    topic() {
        return new Topic();
    }
    subscription() {
        return {
            on: () => {},
            removeListener: () => {},
        };
    }
}

module.exports = { PubSub };

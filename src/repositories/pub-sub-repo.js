module.exports = {
    publishMessage: async (pubSubClient, topicName, payload) => {
        const dataBuffer = Buffer.from(JSON.stringify(payload));

        const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
        console.info(JSON.stringify({ action: 'pubsub.publish', messageId, topicName }));
        return messageId;
    },

    listenForPullMessages: (pubSubClient, subscriptionName,  timeout) => {
        const subscription = pubSubClient.subscription(subscriptionName);

        let messageCount = 0;
        const messageHandler = message => {
            console.info(JSON.stringify({ action: 'pubsub.receive', messageId: message.id }));
            messageCount += 1;

            message.ack();
        };

        subscription.on('message', messageHandler);

        setTimeout(() => {
            subscription.removeListener('message', messageHandler);
            console.info(JSON.stringify({ action: 'pubsub.receive.complete', messageCount }));
        }, timeout * 1000);
    },

    listenForPushMessages: (payload) => {
        const message = Buffer.from(payload, 'base64').toString(
            'utf-8'
        );
        let parsedMessage = JSON.parse(message);
        return parsedMessage;
    }

};

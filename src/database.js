const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
    projectId: "notchdata",
});

module.exports = db;
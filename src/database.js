const Firestore = require('@google-cloud/firestore');

/************ For Testing *****************/
// const path = require('path');
// const db = new Firestore({
//     projectId: 'kuracao-db',
//     keyFilename: path.join(__dirname, process.env.GOOGLE_FIRESTRORE_CREDENTIALS)
// });
/************ END For Testing *****************/

const db = new Firestore({
    projectId: "notchdata",
});

// Ignore undefined fields
db.settings({ ignoreUndefinedProperties: true });

module.exports = db;
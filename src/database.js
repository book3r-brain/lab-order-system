/**
 * Firestore client singleton.
 *
 * The GCP project id is sourced from the validated config (`GCP_PROJECT`)
 * rather than being hard-coded, so dev/stage/prod each get their own
 * Firestore instance without a code change (P1 D-P3 precursor).
 */
const Firestore = require('@google-cloud/firestore');

const projectId = process.env.GCP_PROJECT;
if (!projectId) {
    throw new Error('GCP_PROJECT env var is required to initialize Firestore');
}

const db = new Firestore({ projectId });

module.exports = db;

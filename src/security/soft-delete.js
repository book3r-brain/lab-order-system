const RETENTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isSoftDeleted(record) {
    return Boolean(record && record['deleted-at']);
}

function markSoftDeleted(record, actorId, now) {
    return {
        ...record,
        'deleted-at': now.toISOString(),
        'deleted-by': actorId,
        'retention-until': new Date(now.getTime() + RETENTION_WINDOW_MS).toISOString(),
    };
}

module.exports = {
    isSoftDeleted,
    markSoftDeleted,
};

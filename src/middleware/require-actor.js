function requireActor(req, res, next) {
    const actorId = req.get('X-Authenticated-Actor-Id');

    if (!actorId || typeof actorId !== 'string' || !actorId.trim()) {
        const error = new Error('Authenticated actor id header is required.');
        error.status = 401;
        error.code = 'AUTHENTICATED_ACTOR_ID_MISSING';
        return next(error);
    }

    req.auth = {
        ...(req.auth || {}),
        actorId: actorId.trim(),
    };

    return next();
}

module.exports = requireActor;

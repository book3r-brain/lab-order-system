const { ValidationError } = require('./validation');

function sendError(res, status, message) {
    return res.status(status).json({ error: message });
}

function handleRouteError(res, error) {
    if (error instanceof ValidationError) {
        return sendError(res, 400, error.message);
    }

    return sendError(res, 500, 'Request failed');
}

module.exports = {
    handleRouteError,
    sendError,
};

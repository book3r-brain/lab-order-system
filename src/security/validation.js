const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
const STATUS_REGEX = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,31}$/;
const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$/;

class ValidationError extends Error {}

function assertValidId(value, fieldName, options = {}) {
    const { required = false } = options;

    if (value === undefined || value === null || value === '') {
        if (required) {
            throw new ValidationError(`Invalid ${fieldName}`);
        }

        return;
    }

    if (!ID_REGEX.test(String(value))) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }
}

function assertValidEmail(value, fieldName = 'email', options = {}) {
    const { required = false } = options;

    if (!value) {
        if (required) {
            throw new ValidationError(`Invalid ${fieldName}`);
        }

        return;
    }

    if (!EMAIL_REGEX.test(String(value).trim())) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }
}

function assertValidDate(value, fieldName, options = {}) {
    const { required = false } = options;

    if (!value) {
        if (required) {
            throw new ValidationError(`Invalid ${fieldName}`);
        }

        return;
    }

    if (!DATE_REGEX.test(String(value))) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }
}

function assertValidSsn(value, fieldName = 'patient-ssn') {
    if (!value) {
        return;
    }

    if (!SSN_REGEX.test(String(value))) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }
}

function assertValidStatus(value, fieldName = 'status') {
    if (!value) {
        return;
    }

    if (!STATUS_REGEX.test(String(value))) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }
}

function parsePagination(source) {
    const page = parseInteger(source.page, 1, 'page');
    const pageSize = parseInteger(source['page-size'] || source.pageSize, 25, 'page-size');

    if (page < 1 || pageSize < 1 || pageSize > 100) {
        throw new ValidationError('Invalid pagination parameters');
    }

    return { page, pageSize };
}

function paginate(records, page, pageSize) {
    const start = (page - 1) * pageSize;
    return records.slice(start, start + pageSize);
}

function parseInteger(value, defaultValue, fieldName) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed)) {
        throw new ValidationError(`Invalid ${fieldName}`);
    }

    return parsed;
}

module.exports = {
    ValidationError,
    assertValidDate,
    assertValidEmail,
    assertValidId,
    assertValidSsn,
    assertValidStatus,
    paginate,
    parsePagination,
};

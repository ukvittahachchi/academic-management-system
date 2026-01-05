const { param, body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

exports.validateParam = (paramName) => {
    return [
        param(paramName)
            .exists().withMessage(`${paramName} is required`)
            .isInt().withMessage(`Invalid ${paramName} format`)
            .toInt(),
        handleValidationErrors
    ];
};

exports.validateBody = (fields) => {
    const validations = fields.map(field =>
        body(field).exists().withMessage(`${field} is required`)
    );
    return [
        ...validations,
        handleValidationErrors
    ];
};

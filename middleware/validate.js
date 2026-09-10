const { sendError } = require('../utils/helpers');

/**
 * Reusable schema validator for request body
 */
const validateBody = (rules) => {
  return (req, res, next) => {
    const errors = [];

    for (const field of Object.keys(rules)) {
      const config = rules[field];
      const value = req.body[field];

      if (config.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (config.type === 'number' && typeof value !== 'number') {
          errors.push(`${field} must be a number`);
        }
        if (config.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }
        if (config.min !== undefined && typeof value === 'number' && value < config.min) {
          errors.push(`${field} must be at least ${config.min}`);
        }
        if (config.minLength !== undefined && typeof value === 'string' && value.length < config.minLength) {
          errors.push(`${field} must be at least ${config.minLength} characters`);
        }
        if (config.enum && !config.enum.includes(value)) {
          errors.push(`${field} must be one of: ${config.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return sendError(res, 400, 'Validation failed for request parameters', 'VALIDATION_ERROR', errors);
    }

    next();
  };
};

module.exports = {
  validateBody
};

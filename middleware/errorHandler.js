const { sendError } = require('../utils/helpers');

/**
 * Centralized error handler returning clean JSON responses
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.name || 'Server Error'}: ${err.message}`);

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, 400, `Resource not found with invalid identifier format: '${err.value}'`, 'INVALID_ID');
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    return sendError(res, 409, `Duplicate value '${val}' for unique field '${field}'`, 'DUPLICATE_RESOURCE');
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return sendError(res, 400, 'Data validation failed', 'VALIDATION_ERROR', messages);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid authentication token', 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Authentication token has expired', 'TOKEN_EXPIRED');
  }

  // Default internal server error
  return sendError(
    res,
    err.statusCode || 500,
    err.message || 'An unexpected internal server error occurred',
    err.errorCode || 'INTERNAL_SERVER_ERROR'
  );
};

module.exports = errorHandler;

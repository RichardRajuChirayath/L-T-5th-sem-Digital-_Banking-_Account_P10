const crypto = require('crypto');

/**
 * Generate a unique 10-digit bank account number
 */
const generateAccountNumber = () => {
  const prefix = '100'; // 100xxxxxxx
  const randomDigits = Math.floor(1000000 + Math.random() * 9000000).toString();
  return prefix + randomDigits;
};

/**
 * Generate a unique transaction reference ID
 */
const generateReferenceNumber = (prefix = 'TXN') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Standardized success response helper
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    message
  };
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  return res.status(statusCode).json(response);
};

/**
 * Standardized error response helper
 */
const sendError = (res, statusCode = 400, message = 'Operation failed', errorCode = 'VALIDATION_ERROR', errors = null) => {
  const response = {
    success: false,
    message,
    errorCode
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
};

module.exports = {
  generateAccountNumber,
  generateReferenceNumber,
  sendSuccess,
  sendError
};

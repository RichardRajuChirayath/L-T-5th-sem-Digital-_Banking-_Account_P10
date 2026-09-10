const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/helpers');

/**
 * Protect routes: verify JWT bearer token and load current user
 */
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 401, 'Access denied. No token provided.', 'AUTHENTICATION_REQUIRED');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return sendError(res, 401, 'User associated with this token no longer exists or is inactive.', 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 401, 'Invalid or expired token.', 'INVALID_TOKEN');
  }
};

/**
 * Role-Based Access Control (RBAC) guard
 * Example: authorize('STAFF', 'ADMIN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden: Role '${req.user ? req.user.role : 'GUEST'}' is not authorized to access this resource.`,
        'FORBIDDEN'
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};

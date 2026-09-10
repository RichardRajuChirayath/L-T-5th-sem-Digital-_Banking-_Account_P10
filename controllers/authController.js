const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES } = require('../config/constants');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * Generate JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Customer / User onboarding with initial KYC details
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, panNumber, aadhaarNumber, address, occupation, annualIncome } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 409, 'A user with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
    }

    // Default role is CUSTOMER. Only existing admin can create staff/admin through admin flow
    const assignedRole = role && [ROLES.CUSTOMER].includes(role) ? role : ROLES.CUSTOMER;

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: assignedRole,
      kycStatus: panNumber && aadhaarNumber ? 'VERIFIED' : 'PENDING',
      kycDetails: {
        panNumber: panNumber || '',
        aadhaarNumber: aadhaarNumber || '',
        address: address || '',
        occupation: occupation || '',
        annualIncome: Number(annualIncome) || 0
      }
    });

    const token = generateToken(user._id, user.role);

    return sendSuccess(res, 201, 'User registered successfully with KYC capture.', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
        kycDetails: user.kycDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Please provide both email and password', 'MISSING_CREDENTIALS');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 401, 'Invalid email or password credentials', 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password credentials', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Account is deactivated. Please contact bank administration.', 'ACCOUNT_DEACTIVATED');
    }

    const token = generateToken(user._id, user.role);

    return sendSuccess(res, 200, 'Login successful', {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'User profile fetched', {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        kycStatus: req.user.kycStatus,
        kycDetails: req.user.kycDetails,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/auth/kyc
 * @desc    Update KYC details for customer
 * @access  Private (CUSTOMER)
 */
const updateKYC = async (req, res, next) => {
  try {
    const { panNumber, aadhaarNumber, address, occupation, annualIncome } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    if (panNumber) user.kycDetails.panNumber = panNumber;
    if (aadhaarNumber) user.kycDetails.aadhaarNumber = aadhaarNumber;
    if (address) user.kycDetails.address = address;
    if (occupation) user.kycDetails.occupation = occupation;
    if (annualIncome !== undefined) user.kycDetails.annualIncome = Number(annualIncome);

    if (user.kycDetails.panNumber && user.kycDetails.aadhaarNumber) {
      user.kycStatus = 'VERIFIED';
    }

    await user.save();

    return sendSuccess(res, 200, 'KYC details updated successfully', {
      kycStatus: user.kycStatus,
      kycDetails: user.kycDetails
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateKYC
};

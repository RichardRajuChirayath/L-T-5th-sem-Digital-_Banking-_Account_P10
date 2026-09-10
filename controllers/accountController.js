const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Approval = require('../models/Approval');
const { ACCOUNT_TYPES, ACCOUNT_STATUS, LIMITS, TRANSACTION_TYPES, APPROVAL_DECISIONS, ROLES } = require('../config/constants');
const { generateAccountNumber, generateReferenceNumber, sendSuccess, sendError } = require('../utils/helpers');

/**
 * @route   POST /api/accounts
 * @desc    Apply for a new Bank Account (Savings / Current)
 * @access  Private (CUSTOMER)
 */
const createAccount = async (req, res, next) => {
  try {
    const { type, initialDeposit } = req.body;
    const accountType = type || ACCOUNT_TYPES.SAVINGS;

    if (!Object.values(ACCOUNT_TYPES).includes(accountType)) {
      return sendError(res, 400, `Invalid account type. Must be one of: ${Object.values(ACCOUNT_TYPES).join(', ')}`, 'INVALID_ACCOUNT_TYPE');
    }

    const minDeposit = accountType === ACCOUNT_TYPES.SAVINGS ? LIMITS.MIN_BALANCE_SAVINGS : LIMITS.MIN_BALANCE_CURRENT;
    const depositAmount = Number(initialDeposit) || 0;

    if (depositAmount < minDeposit) {
      return sendError(
        res,
        400,
        `Initial deposit must meet minimum balance requirement of ₹${minDeposit} for ${accountType} account.`,
        'MINIMUM_BALANCE_VIOLATION'
      );
    }

    const accountNumber = generateAccountNumber();

    // New account is created in PENDING_APPROVAL status as required by Core Banking workflow
    const account = await Account.create({
      userId: req.user._id,
      accountNumber,
      type: accountType,
      balance: depositAmount,
      status: ACCOUNT_STATUS.PENDING_APPROVAL,
      interestRate: accountType === ACCOUNT_TYPES.SAVINGS ? LIMITS.SAVINGS_INTEREST_RATE_ANNUAL : 0
    });

    return sendSuccess(res, 201, 'Account application submitted successfully and is pending staff approval.', {
      account
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/accounts
 * @desc    Get accounts of logged-in customer (or all accounts if staff/admin)
 * @access  Private
 */
const getAccounts = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === ROLES.CUSTOMER) {
      filter.userId = req.user._id;
    }

    const accounts = await Account.find(filter)
      .populate('userId', 'name email phone kycStatus')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Accounts retrieved successfully', {
      count: accounts.length,
      accounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/accounts/:id
 * @desc    Get account details by ID
 * @access  Private
 */
const getAccountById = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id).populate('userId', 'name email phone kycStatus');
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    // Customer can only view their own account
    if (req.user.role === ROLES.CUSTOMER && account.userId._id.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Forbidden: You do not have permission to view this account', 'FORBIDDEN');
    }

    return sendSuccess(res, 200, 'Account details retrieved', { account });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/accounts/:id/freeze
 * @desc    Staff or Admin freezes an account pending investigation
 * @access  Private (STAFF, ADMIN)
 */
const freezeAccount = async (req, res, next) => {
  try {
    const { remarks, reason } = req.body;
    const freezeRemark = remarks || reason || 'Account frozen by bank staff pending investigation';

    const account = await Account.findById(req.params.id);
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    if (account.status === ACCOUNT_STATUS.FROZEN) {
      return sendError(res, 400, 'Account is already frozen', 'ALREADY_FROZEN');
    }

    const previousStatus = account.status;
    account.status = ACCOUNT_STATUS.FROZEN;
    account.freezeReason = freezeRemark;
    await account.save();

    // Create audit trail entry
    await Approval.create({
      accountId: account._id,
      staffId: req.user._id,
      decision: APPROVAL_DECISIONS.FROZEN,
      remarks: freezeRemark,
      previousStatus,
      newStatus: ACCOUNT_STATUS.FROZEN
    });

    return sendSuccess(res, 200, 'Account frozen successfully', {
      accountId: account._id,
      accountNumber: account.accountNumber,
      status: account.status,
      freezeReason: account.freezeReason
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/accounts/:id/unfreeze
 * @desc    Staff or Admin unfreezes an account
 * @access  Private (STAFF, ADMIN)
 */
const unfreezeAccount = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const unfreezeRemark = remarks || 'Account verified and unfrozen by authorized staff';

    const account = await Account.findById(req.params.id);
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    if (account.status !== ACCOUNT_STATUS.FROZEN) {
      return sendError(res, 400, 'Account is not currently frozen', 'NOT_FROZEN');
    }

    const previousStatus = account.status;
    account.status = ACCOUNT_STATUS.ACTIVE;
    account.freezeReason = '';
    await account.save();

    // Audit trail
    await Approval.create({
      accountId: account._id,
      staffId: req.user._id,
      decision: APPROVAL_DECISIONS.UNFROZEN,
      remarks: unfreezeRemark,
      previousStatus,
      newStatus: ACCOUNT_STATUS.ACTIVE
    });

    return sendSuccess(res, 200, 'Account unfrozen successfully. Normal operations restored.', {
      accountId: account._id,
      accountNumber: account.accountNumber,
      status: account.status
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  freezeAccount,
  unfreezeAccount
};

const Account = require('../models/Account');
const Approval = require('../models/Approval');
const Transaction = require('../models/Transaction');
const { ACCOUNT_STATUS, APPROVAL_DECISIONS, TRANSACTION_TYPES } = require('../config/constants');
const { generateReferenceNumber, sendSuccess, sendError } = require('../utils/helpers');

/**
 * @route   GET /api/approvals/pending
 * @desc    Get all accounts pending review
 * @access  Private (STAFF, ADMIN)
 */
const getPendingAccounts = async (req, res, next) => {
  try {
    const pendingAccounts = await Account.find({ status: ACCOUNT_STATUS.PENDING_APPROVAL })
      .populate('userId', 'name email phone kycStatus kycDetails')
      .sort({ createdAt: 1 });

    return sendSuccess(res, 200, 'Pending account applications retrieved', {
      count: pendingAccounts.length,
      accounts: pendingAccounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/accounts/:id/approve
 * @desc    Staff approves an account application
 * @access  Private (STAFF, ADMIN)
 */
const approveAccount = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const approvalRemarks = remarks || 'Account approved by authorized staff';

    const account = await Account.findById(req.params.id);
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    if (account.status !== ACCOUNT_STATUS.PENDING_APPROVAL) {
      return sendError(
        res,
        400,
        `Cannot approve account in status '${account.status}'. Only PENDING_APPROVAL accounts can be approved.`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const previousStatus = account.status;
    account.status = ACCOUNT_STATUS.ACTIVE;
    await account.save();

    // If initial deposit > 0, generate an initial credit transaction ledger entry
    if (account.balance > 0) {
      await Transaction.create({
        accountId: account._id,
        accountNumber: account.accountNumber,
        type: TRANSACTION_TYPES.DEPOSIT,
        amount: account.balance,
        balanceAfter: account.balance,
        referenceNumber: generateReferenceNumber('DEP'),
        description: 'Initial deposit upon account opening approval',
        status: 'COMPLETED'
      });
    }

    // Write audit trail record to approvals collection
    const approval = await Approval.create({
      accountId: account._id,
      staffId: req.user._id,
      decision: APPROVAL_DECISIONS.APPROVED,
      remarks: approvalRemarks,
      previousStatus,
      newStatus: ACCOUNT_STATUS.ACTIVE
    });

    return sendSuccess(res, 200, 'Status updated successfully', {
      status: 'Approved',
      account: {
        id: account._id,
        accountNumber: account.accountNumber,
        status: account.status,
        balance: account.balance
      },
      audit: approval
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/accounts/:id/reject
 * @desc    Staff rejects an account application
 * @access  Private (STAFF, ADMIN)
 */
const rejectAccount = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    if (!remarks) {
      return sendError(res, 400, 'Rejection remarks are required for audit trail', 'REMARKS_REQUIRED');
    }

    const account = await Account.findById(req.params.id);
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    if (account.status !== ACCOUNT_STATUS.PENDING_APPROVAL) {
      return sendError(
        res,
        400,
        `Cannot reject account in status '${account.status}'. Only PENDING_APPROVAL accounts can be rejected.`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const previousStatus = account.status;
    account.status = ACCOUNT_STATUS.REJECTED;
    account.freezeReason = remarks;
    await account.save();

    // Write audit record
    const approval = await Approval.create({
      accountId: account._id,
      staffId: req.user._id,
      decision: APPROVAL_DECISIONS.REJECTED,
      remarks,
      previousStatus,
      newStatus: ACCOUNT_STATUS.REJECTED
    });

    return sendSuccess(res, 200, 'Account application rejected', {
      status: ACCOUNT_STATUS.REJECTED,
      account: {
        id: account._id,
        accountNumber: account.accountNumber,
        status: account.status
      },
      audit: approval
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/approvals/audit-trail/:accountId
 * @desc    Get all audit decisions for a specific account
 * @access  Private (STAFF, ADMIN)
 */
const getAccountAuditTrail = async (req, res, next) => {
  try {
    const logs = await Approval.find({ accountId: req.params.accountId })
      .populate('staffId', 'name email role')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Audit trail logs retrieved', {
      count: logs.length,
      logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingAccounts,
  approveAccount,
  rejectAccount,
  getAccountAuditTrail
};

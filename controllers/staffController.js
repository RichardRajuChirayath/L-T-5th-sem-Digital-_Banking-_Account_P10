const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const User = require('../models/User');
const Approval = require('../models/Approval');
const { ACCOUNT_STATUS } = require('../config/constants');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @route   GET /api/staff/flagged-transactions
 * @desc    View all suspicious / flagged transactions for staff review
 * @access  Private (STAFF, ADMIN)
 */
const getFlaggedTransactions = async (req, res, next) => {
  try {
    const flagged = await Transaction.find({ flagged: true })
      .populate('accountId', 'accountNumber balance type status')
      .populate('relatedAccountId', 'accountNumber')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Flagged suspicious transactions retrieved', {
      count: flagged.length,
      transactions: flagged
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/staff/flagged-transactions/:id/dismiss
 * @desc    Staff resolves/dismisses a flag with investigation notes
 * @access  Private (STAFF, ADMIN)
 */
const resolveFlaggedTransaction = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return sendError(res, 404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    transaction.flagged = false;
    transaction.flagReason = `[Resolved by Staff ${req.user.name}]: ${remarks || 'Verified legitimate transaction'}`;
    await transaction.save();

    return sendSuccess(res, 200, 'Flagged transaction resolved successfully', { transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/staff/dashboard
 * @desc    Get consolidated overview for Bank Staff and Managers
 * @access  Private (STAFF, ADMIN)
 */
const getStaffDashboardMetrics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      pendingApprovals,
      activeAccounts,
      frozenAccounts,
      flaggedCount,
      recentTransactions,
      recentApprovals
    ] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      Account.countDocuments({ status: ACCOUNT_STATUS.PENDING_APPROVAL }),
      Account.countDocuments({ status: ACCOUNT_STATUS.ACTIVE }),
      Account.countDocuments({ status: ACCOUNT_STATUS.FROZEN }),
      Transaction.countDocuments({ flagged: true }),
      Transaction.find().sort({ createdAt: -1 }).limit(10),
      Approval.find().populate('staffId', 'name email').populate('accountId', 'accountNumber').sort({ createdAt: -1 }).limit(10)
    ]);

    // Aggregate total system balance
    const balanceAgg = await Account.aggregate([
      { $match: { status: ACCOUNT_STATUS.ACTIVE } },
      { $group: { _id: null, totalLiquidity: { $sum: '$balance' } } }
    ]);

    const totalLiquidity = balanceAgg.length > 0 ? balanceAgg[0].totalLiquidity : 0;

    return sendSuccess(res, 200, 'Staff dashboard metrics retrieved', {
      overview: {
        totalCustomers: totalUsers,
        pendingApprovals,
        activeAccounts,
        frozenAccounts,
        flaggedSuspiciousTransactions: flaggedCount,
        totalActiveLiquidity: Number(totalLiquidity.toFixed(2))
      },
      recentTransactions,
      recentApprovals
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFlaggedTransactions,
  resolveFlaggedTransaction,
  getStaffDashboardMetrics
};

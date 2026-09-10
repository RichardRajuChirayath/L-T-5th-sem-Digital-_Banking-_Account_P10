const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { ROLES } = require('../config/constants');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @route   GET /api/accounts/:id/ledger
 * @desc    Get immutable transaction ledger for an account
 * @access  Private (CUSTOMER for own account, STAFF, ADMIN)
 */
const getAccountLedger = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    if (req.user.role === ROLES.CUSTOMER && account.userId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Forbidden: You cannot view the ledger of an account that does not belong to you', 'FORBIDDEN');
    }

    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const transactions = await Transaction.find({ accountId: account._id })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalCount = await Transaction.countDocuments({ accountId: account._id });

    return sendSuccess(res, 200, 'Ledger transactions retrieved successfully', {
      account: {
        id: account._id,
        accountNumber: account.accountNumber,
        type: account.type,
        currentBalance: account.balance,
        status: account.status
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      transactions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/accounts/:id/statement
 * @desc    Generate date-range filtered statement from ledger with summaries
 * @access  Private (CUSTOMER for own, STAFF, ADMIN)
 */
const getAccountStatement = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    if (req.user.role === ROLES.CUSTOMER && account.userId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Forbidden: You cannot view statements for another user\'s account', 'FORBIDDEN');
    }

    const { startDate, endDate } = req.query;
    let dateFilter = {};

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end of the specified day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    const filter = {
      accountId: account._id,
      ...dateFilter
    };

    const transactions = await Transaction.find(filter).sort({ createdAt: 1 });

    // Calculate aggregated metrics for the statement period
    let totalCredits = 0;
    let totalDebits = 0;
    let creditCount = 0;
    let debitCount = 0;

    transactions.forEach((tx) => {
      if (['DEPOSIT', 'TRANSFER_CREDIT', 'INTEREST'].includes(tx.type)) {
        totalCredits += tx.amount;
        creditCount++;
      } else {
        totalDebits += tx.amount;
        debitCount++;
      }
    });

    const openingBalance = transactions.length > 0
      ? (['DEPOSIT', 'TRANSFER_CREDIT', 'INTEREST'].includes(transactions[0].type)
        ? transactions[0].balanceAfter - transactions[0].amount
        : transactions[0].balanceAfter + transactions[0].amount)
      : account.balance;

    const closingBalance = transactions.length > 0
      ? transactions[transactions.length - 1].balanceAfter
      : account.balance;

    return sendSuccess(res, 200, 'Account statement generated successfully', {
      accountDetails: {
        accountNumber: account.accountNumber,
        type: account.type,
        currency: account.currency,
        currentBalance: account.balance,
        status: account.status
      },
      period: {
        startDate: startDate || 'Beginning of record',
        endDate: endDate || 'Present'
      },
      summary: {
        openingBalance: Number(openingBalance.toFixed(2)),
        closingBalance: Number(closingBalance.toFixed(2)),
        totalCredits: Number(totalCredits.toFixed(2)),
        totalDebits: Number(totalDebits.toFixed(2)),
        netFlow: Number((totalCredits - totalDebits).toFixed(2)),
        totalTransactions: transactions.length,
        creditCount,
        debitCount
      },
      transactions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAccountLedger,
  getAccountStatement
};

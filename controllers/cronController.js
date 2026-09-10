const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { ACCOUNT_TYPES, ACCOUNT_STATUS, TRANSACTION_TYPES } = require('../config/constants');
const { generateReferenceNumber, sendSuccess } = require('../utils/helpers');

/**
 * @route   POST /api/jobs/calculate-interest
 * @desc    Execute batch interest accrual for all active savings accounts
 * @access  Private (ADMIN, STAFF)
 */
const runInterestCalculation = async (req, res, next) => {
  try {
    const { periodMonths = 1 } = req.body;
    const months = Number(periodMonths) || 1;

    // Fetch all active savings accounts with positive balance
    const accounts = await Account.find({
      type: ACCOUNT_TYPES.SAVINGS,
      status: ACCOUNT_STATUS.ACTIVE,
      balance: { $gt: 0 }
    });

    const results = [];
    let totalInterestCredited = 0;

    for (const account of accounts) {
      // Monthly Simple Interest Formula: (Balance * AnnualRate% * months) / 12
      const annualRate = account.interestRate || 4.0;
      const interestAmount = Number(((account.balance * (annualRate / 100) * months) / 12).toFixed(2));

      if (interestAmount >= 0.01) {
        account.balance += interestAmount;
        account.lastInterestCalculatedAt = new Date();
        await account.save();

        const referenceNumber = generateReferenceNumber('INT');

        // Immutable ledger credit entry
        const tx = await Transaction.create({
          accountId: account._id,
          accountNumber: account.accountNumber,
          type: TRANSACTION_TYPES.INTEREST,
          amount: interestAmount,
          balanceAfter: account.balance,
          referenceNumber,
          description: `Interest credit for ${months} month(s) at ${annualRate}% p.a.`,
          flagged: false,
          status: 'COMPLETED'
        });

        totalInterestCredited += interestAmount;
        results.push({
          accountId: account._id,
          accountNumber: account.accountNumber,
          interestAmount,
          newBalance: account.balance,
          referenceNumber
        });
      }
    }

    return sendSuccess(res, 200, `Interest calculation job completed for ${results.length} active savings accounts`, {
      accountsProcessed: accounts.length,
      accountsCredited: results.length,
      totalInterestDisbursed: Number(totalInterestCredited.toFixed(2)),
      details: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runInterestCalculation
};

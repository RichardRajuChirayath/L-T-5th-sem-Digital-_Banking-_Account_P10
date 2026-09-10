const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { ACCOUNT_STATUS, ACCOUNT_TYPES, LIMITS, TRANSACTION_TYPES } = require('../config/constants');
const { generateReferenceNumber, sendSuccess, sendError } = require('../utils/helpers');

/**
 * @route   POST /api/transactions/transfer
 * @desc    Atomic fund transfer between accounts with balance, limit, and suspicious checks
 * @access  Private (CUSTOMER)
 */
const transferFunds = async (req, res, next) => {
  try {
    const { fromAccountNumber, toAccountNumber, amount, description } = req.body;
    const transferAmount = Number(amount);

    if (!fromAccountNumber || !toAccountNumber || !transferAmount || transferAmount <= 0) {
      return sendError(res, 400, 'Please provide valid source account, destination account, and positive transfer amount', 'INVALID_TRANSFER_PARAMETERS');
    }

    if (fromAccountNumber === toAccountNumber) {
      return sendError(res, 400, 'Source and destination accounts cannot be identical', 'IDENTICAL_ACCOUNTS');
    }

    // 1. Fetch source account and verify ownership
    const fromAccount = await Account.findOne({ accountNumber: fromAccountNumber });
    if (!fromAccount) {
      return sendError(res, 404, 'Source account does not exist', 'SOURCE_ACCOUNT_NOT_FOUND');
    }

    if (fromAccount.userId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Unauthorized: You can only transfer funds from your own accounts', 'FORBIDDEN');
    }

    // 2. Check source account status
    if (fromAccount.status === ACCOUNT_STATUS.FROZEN) {
      return sendError(res, 403, 'Source account is FROZEN. Fund transfer operations are temporarily restricted.', 'ACCOUNT_FROZEN');
    }
    if (fromAccount.status !== ACCOUNT_STATUS.ACTIVE) {
      return sendError(res, 403, `Source account is not active (Current status: ${fromAccount.status})`, 'ACCOUNT_INACTIVE');
    }

    // 3. Fetch destination account and check status
    const toAccount = await Account.findOne({ accountNumber: toAccountNumber });
    if (!toAccount) {
      return sendError(res, 404, 'Destination account not found in system records', 'DESTINATION_ACCOUNT_NOT_FOUND');
    }

    if (toAccount.status === ACCOUNT_STATUS.FROZEN) {
      return sendError(res, 403, 'Destination account is FROZEN and cannot receive funds.', 'DESTINATION_ACCOUNT_FROZEN');
    }
    if (toAccount.status !== ACCOUNT_STATUS.ACTIVE) {
      return sendError(res, 403, `Destination account is not active (Current status: ${toAccount.status})`, 'DESTINATION_ACCOUNT_INACTIVE');
    }

    // 4. Minimum balance enforcement
    const requiredMinBalance = fromAccount.type === ACCOUNT_TYPES.SAVINGS ? LIMITS.MIN_BALANCE_SAVINGS : LIMITS.MIN_BALANCE_CURRENT;
    if (fromAccount.balance - transferAmount < requiredMinBalance) {
      return sendError(
        res,
        400,
        `Insufficient funds. Transfer would violate the minimum balance requirement of ₹${requiredMinBalance}. Current balance: ₹${fromAccount.balance}. Maximum transferable: ₹${Math.max(0, fromAccount.balance - requiredMinBalance)}.`,
        'MINIMUM_BALANCE_VIOLATION'
      );
    }

    // 5. Daily transfer limit check
    const today = new Date();
    const isSameDay = fromAccount.lastTransferDate &&
      new Date(fromAccount.lastTransferDate).toDateString() === today.toDateString();

    const currentDailyUsage = isSameDay ? fromAccount.transferredToday : 0;
    if (currentDailyUsage + transferAmount > fromAccount.dailyTransferLimit) {
      return sendError(
        res,
        400,
        `Transfer exceeds daily transfer limit of ₹${fromAccount.dailyTransferLimit}. Transferred today: ₹${currentDailyUsage}. Remaining allowance: ₹${fromAccount.dailyTransferLimit - currentDailyUsage}.`,
        'DAILY_LIMIT_EXCEEDED'
      );
    }

    // 6. Suspicious transaction threshold check
    const isSuspicious = transferAmount >= LIMITS.FLAGGED_TRANSACTION_THRESHOLD;
    const flagReason = isSuspicious
      ? `High-value transfer of ₹${transferAmount} exceeds the monitoring threshold of ₹${LIMITS.FLAGGED_TRANSACTION_THRESHOLD}`
      : null;

    // 7. Atomic transfer execution using MongoDB atomic findOneAndUpdate sequence or session
    const referenceNumber = generateReferenceNumber('TRF');

    // Debit source account
    fromAccount.balance -= transferAmount;
    fromAccount.transferredToday = currentDailyUsage + transferAmount;
    fromAccount.lastTransferDate = today;
    await fromAccount.save();

    // Credit destination account
    toAccount.balance += transferAmount;
    await toAccount.save();

    // 8. Write dual immutable ledger entries
    // Ledger 1: Debit from sender
    const debitEntry = await Transaction.create({
      accountId: fromAccount._id,
      accountNumber: fromAccount.accountNumber,
      type: TRANSACTION_TYPES.TRANSFER_DEBIT,
      amount: transferAmount,
      balanceAfter: fromAccount.balance,
      relatedAccountId: toAccount._id,
      relatedAccountNumber: toAccount.accountNumber,
      referenceNumber: `${referenceNumber}-DR`,
      description: description || `Transfer to A/C ${toAccount.accountNumber}`,
      flagged: isSuspicious,
      flagReason,
      status: 'COMPLETED'
    });

    // Ledger 2: Credit to receiver
    const creditEntry = await Transaction.create({
      accountId: toAccount._id,
      accountNumber: toAccount.accountNumber,
      type: TRANSACTION_TYPES.TRANSFER_CREDIT,
      amount: transferAmount,
      balanceAfter: toAccount.balance,
      relatedAccountId: fromAccount._id,
      relatedAccountNumber: fromAccount.accountNumber,
      referenceNumber: `${referenceNumber}-CR`,
      description: description || `Transfer from A/C ${fromAccount.accountNumber}`,
      flagged: isSuspicious,
      flagReason,
      status: 'COMPLETED'
    });

    return sendSuccess(res, 201, 'Fund transfer executed successfully.', {
      referenceNumber,
      amount: transferAmount,
      fromAccount: {
        accountNumber: fromAccount.accountNumber,
        balanceAfter: fromAccount.balance
      },
      toAccount: {
        accountNumber: toAccount.accountNumber
      },
      flagged: isSuspicious,
      flagReason,
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/transactions/deposit
 * @desc    Simulate cash/counter deposit into an active account
 * @access  Private
 */
const depositFunds = async (req, res, next) => {
  try {
    const { accountNumber, amount, description } = req.body;
    const depositAmount = Number(amount);

    if (!accountNumber || !depositAmount || depositAmount <= 0) {
      return sendError(res, 400, 'Valid account number and positive amount are required', 'INVALID_PARAMETERS');
    }

    const account = await Account.findOne({ accountNumber });
    if (!account) {
      return sendError(res, 404, 'Account not found', 'ACCOUNT_NOT_FOUND');
    }

    if (account.status !== ACCOUNT_STATUS.ACTIVE) {
      return sendError(res, 400, `Cannot deposit into an account with status '${account.status}'`, 'ACCOUNT_NOT_ACTIVE');
    }

    account.balance += depositAmount;
    await account.save();

    const isSuspicious = depositAmount >= LIMITS.FLAGGED_TRANSACTION_THRESHOLD;
    const flagReason = isSuspicious ? `High cash deposit of ₹${depositAmount} flagged for AML compliance` : null;

    const referenceNumber = generateReferenceNumber('DEP');

    const transaction = await Transaction.create({
      accountId: account._id,
      accountNumber: account.accountNumber,
      type: TRANSACTION_TYPES.DEPOSIT,
      amount: depositAmount,
      balanceAfter: account.balance,
      referenceNumber,
      description: description || 'Cash Deposit',
      flagged: isSuspicious,
      flagReason,
      status: 'COMPLETED'
    });

    return sendSuccess(res, 201, 'Deposit successful', {
      referenceNumber,
      accountNumber: account.accountNumber,
      balanceAfter: account.balance,
      flagged: isSuspicious,
      flagReason
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  transferFunds,
  depositFunds
};

const mongoose = require('mongoose');
const { TRANSACTION_TYPES, TRANSACTION_STATUS } = require('../config/constants');

const transactionSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than 0']
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    relatedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null
    },
    relatedAccountNumber: {
      type: String,
      default: null
    },
    referenceNumber: {
      type: String,
      unique: true,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    flagged: {
      type: Boolean,
      default: false
    },
    flagReason: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.COMPLETED
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable ledger, no updates
  }
);

// Indexes
transactionSchema.index({ accountId: 1, createdAt: -1 });
transactionSchema.index({ accountNumber: 1, createdAt: -1 });
transactionSchema.index({ flagged: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

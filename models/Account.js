const mongoose = require('mongoose');
const { ACCOUNT_TYPES, ACCOUNT_STATUS, LIMITS } = require('../config/constants');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account must belong to a user']
    },
    accountNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(ACCOUNT_TYPES),
      default: ACCOUNT_TYPES.SAVINGS
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative']
    },
    status: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.PENDING_APPROVAL
    },
    currency: {
      type: String,
      default: 'INR'
    },
    dailyTransferLimit: {
      type: Number,
      default: LIMITS.DAILY_TRANSFER_LIMIT
    },
    transferredToday: {
      type: Number,
      default: 0
    },
    lastTransferDate: {
      type: Date,
      default: null
    },
    interestRate: {
      type: Number,
      default: LIMITS.SAVINGS_INTEREST_RATE_ANNUAL
    },
    lastInterestCalculatedAt: {
      type: Date,
      default: null
    },
    freezeReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

accountSchema.index({ userId: 1 });
accountSchema.index({ status: 1 });

module.exports = mongoose.model('Account', accountSchema);

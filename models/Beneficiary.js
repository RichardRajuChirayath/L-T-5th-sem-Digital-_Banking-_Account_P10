const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sourceAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    beneficiaryAccountNumber: {
      type: String,
      required: [true, 'Beneficiary account number is required'],
      trim: true
    },
    beneficiaryName: {
      type: String,
      required: [true, 'Beneficiary name is required'],
      trim: true
    },
    bankName: {
      type: String,
      default: 'Global Digital Bank',
      trim: true
    },
    ifscCode: {
      type: String,
      default: 'GDBK0001001',
      uppercase: true,
      trim: true
    },
    nickname: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
beneficiarySchema.index({ userId: 1 });
beneficiarySchema.index({ sourceAccountId: 1 });
beneficiarySchema.index({ userId: 1, beneficiaryAccountNumber: 1 }, { unique: true });

module.exports = mongoose.model('Beneficiary', beneficiarySchema);

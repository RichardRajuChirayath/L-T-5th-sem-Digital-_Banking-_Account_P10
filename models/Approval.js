const mongoose = require('mongoose');
const { APPROVAL_DECISIONS } = require('../config/constants');

const approvalSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    decision: {
      type: String,
      enum: Object.values(APPROVAL_DECISIONS),
      required: true
    },
    remarks: {
      type: String,
      required: [true, 'Remarks are required for audit trail'],
      trim: true
    },
    previousStatus: {
      type: String,
      required: true
    },
    newStatus: {
      type: String,
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Indexes
approvalSchema.index({ accountId: 1 });
approvalSchema.index({ staffId: 1 });
approvalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Approval', approvalSchema);

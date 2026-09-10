const Beneficiary = require('../models/Beneficiary');
const Account = require('../models/Account');
const { sendSuccess, sendError } = require('../utils/helpers');

/**
 * @route   POST /api/beneficiaries
 * @desc    Add a trusted transfer beneficiary
 * @access  Private (CUSTOMER)
 */
const addBeneficiary = async (req, res, next) => {
  try {
    const { sourceAccountId, beneficiaryAccountNumber, beneficiaryName, bankName, ifscCode, nickname } = req.body;

    // Validate source account ownership
    const sourceAccount = await Account.findOne({ _id: sourceAccountId, userId: req.user._id });
    if (!sourceAccount) {
      return sendError(res, 404, 'Source account not found or does not belong to you', 'ACCOUNT_NOT_FOUND');
    }

    // Check if source account number is same as beneficiary account number (self-beneficiary not needed)
    if (sourceAccount.accountNumber === beneficiaryAccountNumber) {
      return sendError(res, 400, 'Cannot add your own account as a beneficiary', 'SELF_BENEFICIARY_INVALID');
    }

    // Check if already registered
    const existing = await Beneficiary.findOne({
      userId: req.user._id,
      beneficiaryAccountNumber
    });
    if (existing) {
      return sendError(res, 409, 'This beneficiary account is already registered in your list', 'DUPLICATE_BENEFICIARY');
    }

    const beneficiary = await Beneficiary.create({
      userId: req.user._id,
      sourceAccountId,
      beneficiaryAccountNumber,
      beneficiaryName,
      bankName: bankName || 'Global Digital Bank',
      ifscCode: ifscCode || 'GDBK0001001',
      nickname: nickname || beneficiaryName
    });

    return sendSuccess(res, 201, 'Beneficiary added successfully', { beneficiary });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/beneficiaries
 * @desc    Get all beneficiaries for current user
 * @access  Private (CUSTOMER)
 */
const getBeneficiaries = async (req, res, next) => {
  try {
    const beneficiaries = await Beneficiary.find({ userId: req.user._id, isActive: true })
      .populate('sourceAccountId', 'accountNumber type balance status')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Beneficiaries retrieved successfully', {
      count: beneficiaries.length,
      beneficiaries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/beneficiaries/:id
 * @desc    Remove or deactivate a beneficiary
 * @access  Private (CUSTOMER)
 */
const deleteBeneficiary = async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id, userId: req.user._id });
    if (!beneficiary) {
      return sendError(res, 404, 'Beneficiary not found', 'BENEFICIARY_NOT_FOUND');
    }

    await Beneficiary.findByIdAndDelete(req.params.id);

    return sendSuccess(res, 200, 'Beneficiary removed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBeneficiary,
  getBeneficiaries,
  deleteBeneficiary
};

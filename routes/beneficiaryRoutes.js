const express = require('express');
const router = express.Router();
const {
  addBeneficiary,
  getBeneficiaries,
  deleteBeneficiary
} = require('../controllers/beneficiaryController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { validateBody } = require('../middleware/validate');

// All beneficiary operations restricted to logged-in customers
router.use(protect);
router.use(authorize(ROLES.CUSTOMER));

// Sample endpoint: POST /api/beneficiaries
router.post(
  '/',
  validateBody({
    sourceAccountId: { required: true, type: 'string' },
    beneficiaryAccountNumber: { required: true, type: 'string' },
    beneficiaryName: { required: true, type: 'string' }
  }),
  addBeneficiary
);

router.get('/', getBeneficiaries);
router.delete('/:id', deleteBeneficiary);

module.exports = router;

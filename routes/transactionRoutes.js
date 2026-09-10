const express = require('express');
const router = express.Router();
const { transferFunds, depositFunds } = require('../controllers/transferController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { validateBody } = require('../middleware/validate');

router.use(protect);

// Sample endpoint: POST /api/transactions/transfer
router.post(
  '/transfer',
  authorize(ROLES.CUSTOMER),
  validateBody({
    fromAccountNumber: { required: true, type: 'string' },
    toAccountNumber: { required: true, type: 'string' },
    amount: { required: true, type: 'number', min: 1 }
  }),
  transferFunds
);

// Deposit endpoint (for test setup and demo cash deposits)
router.post(
  '/deposit',
  validateBody({
    accountNumber: { required: true, type: 'string' },
    amount: { required: true, type: 'number', min: 1 }
  }),
  depositFunds
);

module.exports = router;

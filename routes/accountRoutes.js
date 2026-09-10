const express = require('express');
const router = express.Router();
const {
  createAccount,
  getAccounts,
  getAccountById,
  freezeAccount,
  unfreezeAccount
} = require('../controllers/accountController');
const {
  approveAccount,
  rejectAccount
} = require('../controllers/approvalController');
const {
  getAccountLedger,
  getAccountStatement
} = require('../controllers/ledgerController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const { validateBody } = require('../middleware/validate');

// Customer and Staff routes
router.post(
  '/',
  protect,
  validateBody({
    type: { required: true, type: 'string', enum: ['SAVINGS', 'CURRENT'] },
    initialDeposit: { required: true, type: 'number', min: 0 }
  }),
  createAccount
);

router.get('/', protect, getAccounts);
router.get('/:id', protect, getAccountById);

// Staff approval workflow endpoints (exact sample endpoint: PUT /api/accounts/:id/approve)
router.put(
  '/:id/approve',
  protect,
  authorize(ROLES.STAFF, ROLES.ADMIN),
  approveAccount
);

router.put(
  '/:id/reject',
  protect,
  authorize(ROLES.STAFF, ROLES.ADMIN),
  rejectAccount
);

// Staff freeze/unfreeze endpoints (sample endpoint: PUT /api/accounts/:id/freeze)
router.put(
  '/:id/freeze',
  protect,
  authorize(ROLES.STAFF, ROLES.ADMIN),
  freezeAccount
);

router.put(
  '/:id/unfreeze',
  protect,
  authorize(ROLES.STAFF, ROLES.ADMIN),
  unfreezeAccount
);

// Ledger & Statement endpoints (sample endpoint: GET /api/accounts/:id/statement)
router.get('/:id/ledger', protect, getAccountLedger);
router.get('/:id/statement', protect, getAccountStatement);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getPendingAccounts,
  getAccountAuditTrail
} = require('../controllers/approvalController');
const {
  getFlaggedTransactions,
  resolveFlaggedTransaction,
  getStaffDashboardMetrics
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(protect);
router.use(authorize(ROLES.STAFF, ROLES.ADMIN));

// Sample endpoint: GET /api/staff/flagged-transactions
router.get('/flagged-transactions', getFlaggedTransactions);
router.put('/flagged-transactions/:id/dismiss', resolveFlaggedTransaction);

// Dashboard overview
router.get('/dashboard', getStaffDashboardMetrics);

// Approvals overview
router.get('/pending-accounts', getPendingAccounts);
router.get('/audit-trail/:accountId', getAccountAuditTrail);

module.exports = router;

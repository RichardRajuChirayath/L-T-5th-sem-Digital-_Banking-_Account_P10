const express = require('express');
const router = express.Router();
const { runInterestCalculation } = require('../controllers/cronController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(protect);
router.use(authorize(ROLES.ADMIN, ROLES.STAFF));

// Endpoint to trigger interest calculation batch logic
router.post('/calculate-interest', runInterestCalculation);

module.exports = router;

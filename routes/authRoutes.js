const express = require('express');
const router = express.Router();
const { register, login, getMe, updateKYC } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

router.post(
  '/register',
  validateBody({
    name: { required: true, type: 'string', minLength: 2 },
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string', minLength: 6 }
  }),
  register
);

router.post(
  '/login',
  validateBody({
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' }
  }),
  login
);

router.get('/me', protect, getMe);

router.put(
  '/kyc',
  protect,
  validateBody({
    panNumber: { required: false, type: 'string' },
    aadhaarNumber: { required: false, type: 'string' }
  }),
  updateKYC
);

module.exports = router;

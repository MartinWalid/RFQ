const express = require('express');
const router = express.Router();
const { submitFinanceData, getFinanceData } = require('../controllers/financeController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.get('/:id/finance', authenticate, authorizeRoles('finance', 'admin'), getFinanceData);
router.post('/:id/finance', authenticate, authorizeRoles('finance', 'admin'), submitFinanceData);

module.exports = router;
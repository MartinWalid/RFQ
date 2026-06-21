const express = require('express');
const router = express.Router();
const { generateQuotation } = require('../controllers/quotationController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Customer-facing quotation PDF. Sales delivers it, finance/admin own the pricing.
router.get(
    '/:id/quotation',
    authenticate,
    authorizeRoles('sales', 'finance', 'admin'),
    generateQuotation
);

module.exports = router;

const express = require('express');
const router = express.Router();

const { submitOpsData, getOpsData } = require('../controllers/opsController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

/**
 * Finance needs read-only access to operation costing data
 * so it can build the final pricing page from sourced suppliers.
 */
router.get(
    '/:id/ops',
    authenticate,
    authorizeRoles('operations', 'finance', 'admin'),
    getOpsData
);

/**
 * Only Operations and Admin can create/update sourcing data.
 */
router.post(
    '/:id/ops',
    authenticate,
    authorizeRoles('operations', 'admin'),
    submitOpsData
);

module.exports = router;

const express = require('express');
const router = express.Router();
const { submitOpsData, getOpsData } = require('../controllers/opsController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.get('/:id/ops', authenticate, authorizeRoles('operations', 'admin'), getOpsData);
router.post('/:id/ops', authenticate, authorizeRoles('operations', 'admin'), submitOpsData);

module.exports = router;
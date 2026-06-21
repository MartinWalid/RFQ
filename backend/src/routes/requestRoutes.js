const express = require('express');
const router = express.Router();
const { create, getAll, getOne, getDashboardStats, update, cancel, changeStatus } = require('../controllers/requestController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.get('/dashboard', authenticate, getDashboardStats);
router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.post('/', authenticate, authorizeRoles('sales', 'admin'), create);
router.put('/:id/status', authenticate, authorizeRoles('operations', 'finance', 'admin'), changeStatus);
router.put('/:id', authenticate, authorizeRoles('sales', 'admin'), update);
router.patch('/:id/cancel', authenticate, authorizeRoles('sales', 'admin'), cancel);

module.exports = router;
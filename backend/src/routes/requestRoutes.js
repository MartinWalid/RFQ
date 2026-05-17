const express = require('express');
const router = express.Router();
const { create, getAll, getOne, getDashboardStats, changeStatus } = require('../controllers/requestController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.get('/dashboard', authenticate, getDashboardStats);
router.get('/', authenticate, getAll);
router.get('/:id', authenticate, getOne);
router.post('/', authenticate, authorizeRoles('sales', 'admin'), create);
router.put('/:id/status', authenticate, authorizeRoles('operations', 'finance', 'admin'), changeStatus);

module.exports = router;
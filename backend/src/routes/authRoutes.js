const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, getMe);

router.post(
    '/register',
    authenticate,
    authorizeRoles('admin'),
    register
);

module.exports = router;
// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, logout, getMe, changePassword } = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', isAuthenticated, logout);
router.get('/me', getMe);
router.post('/change-password', isAuthenticated, changePassword);

module.exports = router;

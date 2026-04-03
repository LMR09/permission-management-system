// routes/principalRoutes.js
const express = require('express');
const router  = express.Router();
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');
const { getDashboardStats, getPendingRequests, getHistory, takeAction } = require('../controllers/principalController');

const principalOnly = [isAuthenticated, authorizeRoles('principal')];

router.get('/dashboard-stats', ...principalOnly, getDashboardStats);
router.get('/pending',         ...principalOnly, getPendingRequests);
router.get('/history',         ...principalOnly, getHistory);
router.post('/action/:id',     ...principalOnly, takeAction);

module.exports = router;

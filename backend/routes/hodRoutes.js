// routes/hodRoutes.js
const express = require('express');
const router  = express.Router();
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');
const { getDashboardStats, getPendingRequests, getHistory, takeAction } = require('../controllers/hodController');

const hodOnly = [isAuthenticated, authorizeRoles('hod')];

router.get('/dashboard-stats', ...hodOnly, getDashboardStats);
router.get('/pending',         ...hodOnly, getPendingRequests);
router.get('/history',         ...hodOnly, getHistory);
router.post('/action/:id',     ...hodOnly, takeAction);

module.exports = router;

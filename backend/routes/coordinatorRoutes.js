// routes/coordinatorRoutes.js
const express = require('express');
const router  = express.Router();
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');
const {
  getDashboardStats,
  getPendingRequests,
  getHistory,
  takeAction
} = require('../controllers/coordinatorController');

const coordOnly = [isAuthenticated, authorizeRoles('coordinator')];

router.get('/dashboard-stats', ...coordOnly, getDashboardStats);
router.get('/pending',         ...coordOnly, getPendingRequests);
router.get('/history',         ...coordOnly, getHistory);
router.post('/action/:id',     ...coordOnly, takeAction);

module.exports = router;

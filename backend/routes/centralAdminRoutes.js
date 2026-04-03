// routes/centralAdminRoutes.js
const express = require('express');
const router  = express.Router();
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');
const {
  getDashboardStats, getPrincipals, addPrincipal, togglePrincipal,
  getBranches, addBranch, getSystemLogs, addBranchAdmin
} = require('../controllers/centralAdminController');

const caOnly = [isAuthenticated, authorizeRoles('central_admin')];

router.get('/dashboard-stats',            ...caOnly, getDashboardStats);
router.get('/principals',                 ...caOnly, getPrincipals);
router.post('/principals',                ...caOnly, addPrincipal);
router.patch('/principals/:id/toggle',    ...caOnly, togglePrincipal);
router.get('/branches',                   ...caOnly, getBranches);
router.post('/branches',                  ...caOnly, addBranch);
router.get('/logs',                       ...caOnly, getSystemLogs);
router.post('/branch-admins',             ...caOnly, addBranchAdmin);

module.exports = router;

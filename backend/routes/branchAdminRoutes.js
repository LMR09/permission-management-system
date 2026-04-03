// routes/branchAdminRoutes.js
const express = require('express');
const router  = express.Router();
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');
const {
  getDashboardStats, getBranchUsers, createUser,
  toggleUser, overridePermission, getAllPermissions
} = require('../controllers/branchAdminController');

const adminOnly = [isAuthenticated, authorizeRoles('branch_admin')];

router.get('/dashboard-stats',        ...adminOnly, getDashboardStats);
router.get('/users',                  ...adminOnly, getBranchUsers);
router.post('/users',                 ...adminOnly, createUser);
router.patch('/users/:id/toggle',     ...adminOnly, toggleUser);
router.post('/override/:id',          ...adminOnly, overridePermission);
router.get('/permissions',            ...adminOnly, getAllPermissions);

module.exports = router;

// routes/studentRoutes.js
const express = require('express');
const router  = express.Router();
const { isAuthenticated, authorizeRoles } = require('../middleware/auth');
const {
  getDashboardStats,
  createPermission,
  getMyPermissions,
  getPermissionLogs,
  downloadPDF
} = require('../controllers/studentController');

const studentOnly = [isAuthenticated, authorizeRoles('student')];

router.get('/dashboard-stats',         ...studentOnly, getDashboardStats);
router.post('/permissions',            ...studentOnly, createPermission);
router.get('/permissions',             ...studentOnly, getMyPermissions);
router.get('/permissions/:id/logs',    ...studentOnly, getPermissionLogs);
router.get('/permissions/:id/pdf',     ...studentOnly, downloadPDF);

module.exports = router;

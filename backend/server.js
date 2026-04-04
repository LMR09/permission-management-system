// server.js - Main entry point for Permission Management System backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { testConnection } = require('./config/db');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;


// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://permission-management-system.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Session Configuration ────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'pms_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
  secure: true,
  httpOnly: true,
  sameSite: 'none',
  maxAge: 24 * 60 * 60 * 1000
}
}));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/student',      require('./routes/studentRoutes'));
app.use('/api/coordinator',  require('./routes/coordinatorRoutes'));
app.use('/api/hod',          require('./routes/hodRoutes'));
app.use('/api/principal',    require('./routes/principalRoutes'));
app.use('/api/branch-admin', require('./routes/branchAdminRoutes'));
app.use('/api/central-admin',require('./routes/centralAdminRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Permission Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────
const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 PMS Backend running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();

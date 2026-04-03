// middleware/auth.js
// Protects routes - checks session and role

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ 
    success: false, 
    message: 'Please login to continue' 
  });
};

// Allow only specific roles to access a route
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    const userRole = req.session.user.role_name;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

module.exports = { isAuthenticated, authorizeRoles };

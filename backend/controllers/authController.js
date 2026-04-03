// controllers/authController.js
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Fetch user with role info
    const [rows] = await pool.execute(
      `SELECT 
        u.user_id, u.name, u.email, u.password_hash,
        u.role_id, r.role_name,
        u.branch_id, b.branch_name, b.branch_code,
        u.section_id, s.section_name,
        u.roll_number, u.phone,
        u.is_active, u.is_assistant
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN branches b ON u.branch_id = b.branch_id
       LEFT JOIN sections s ON u.section_id = s.section_id
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been disabled. Contact admin.' 
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Build session object (no password)
    const sessionUser = {
      user_id:      user.user_id,
      name:         user.name,
      email:        user.email,
      role_id:      user.role_id,
      role_name:    user.role_name,
      branch_id:    user.branch_id,
      branch_name:  user.branch_name,
      branch_code:  user.branch_code,
      section_id:   user.section_id,
      section_name: user.section_name,
      roll_number:  user.roll_number,
      is_assistant: user.is_assistant
    };

    req.session.user = sessionUser;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: sessionUser
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
};

// GET /api/auth/me
const getMe = (req, res) => {
  if (req.session && req.session.user) {
    return res.status(200).json({ 
      success: true, 
      user: req.session.user 
    });
  }
  return res.status(401).json({ 
    success: false, 
    message: 'Not authenticated' 
  });
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.session.user.user_id;

    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both current and new password required' 
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters' 
      });
    }

    const [rows] = await pool.execute(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [userId]
    );

    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [newHash, userId]
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = { login, logout, getMe, changePassword };

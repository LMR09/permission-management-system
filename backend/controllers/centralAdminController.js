// controllers/centralAdminController.js
const { pool } = require('../config/db');
const bcrypt   = require('bcryptjs');

// GET /api/central-admin/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    const [[branches]]    = await pool.execute('SELECT COUNT(*) AS c FROM branches WHERE is_active=TRUE');
    const [[principals]]  = await pool.execute(
      `SELECT COUNT(*) AS c FROM users u JOIN roles r ON u.role_id=r.role_id
       WHERE r.role_name='principal' AND u.is_active=TRUE`
    );
    const [[totalUsers]]  = await pool.execute('SELECT COUNT(*) AS c FROM users WHERE is_active=TRUE');
    const [[totalReqs]]   = await pool.execute('SELECT COUNT(*) AS c FROM permission_requests');

    return res.json({
      success: true,
      stats: {
        branches:       branches.c,
        principals:     principals.c,
        total_users:    totalUsers.c,
        total_requests: totalReqs.c
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/central-admin/principals
const getPrincipals = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.name, u.email, u.phone, u.is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id=r.role_id
       WHERE r.role_name='principal'
       ORDER BY u.created_at DESC`
    );
    return res.json({ success: true, principals: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/central-admin/principals - Add a new principal
const addPrincipal = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const adminId = req.session.user.user_id;
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const [exists] = await conn.execute('SELECT user_id FROM users WHERE email=?', [email.toLowerCase()]);
    if (exists.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const [[role]] = await conn.execute('SELECT role_id FROM roles WHERE role_name=?', ['principal']);
    const hash     = await bcrypt.hash(password, 10);

    const [result] = await conn.execute(
      `INSERT INTO users (name, email, password_hash, role_id, phone)
       VALUES (?,?,?,?,?)`,
      [name, email.toLowerCase(), hash, role.role_id, phone || null]
    );

    await conn.execute(
      `INSERT INTO admin_actions (admin_id, admin_role, action_type, target_user_id, remarks)
       VALUES (?, 'central_admin', 'assign_principal', ?, ?)`,
      [adminId, result.insertId, `Added Principal: ${name}`]
    );

    await conn.commit();
    return res.status(201).json({ success: true, message: 'Principal added', user_id: result.insertId });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

// PATCH /api/central-admin/principals/:id/toggle
const togglePrincipal = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const adminId = req.session.user.user_id;
    const { id }  = req.params;

    const [rows] = await conn.execute(
      `SELECT u.user_id, u.name, u.is_active FROM users u
       JOIN roles r ON u.role_id=r.role_id
       WHERE u.user_id=? AND r.role_name='principal'`,
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Principal not found' });
    }

    const newStatus = !rows[0].is_active;
    await conn.execute('UPDATE users SET is_active=? WHERE user_id=?', [newStatus, id]);

    await conn.execute(
      `INSERT INTO admin_actions (admin_id, admin_role, action_type, target_user_id, remarks)
       VALUES (?, 'central_admin', ?, ?, ?)`,
      [adminId, newStatus ? 'enable_user' : 'disable_user', id,
       `${newStatus ? 'Enabled' : 'Disabled'} Principal: ${rows[0].name}`]
    );

    await conn.commit();
    return res.json({ success: true, message: `Principal ${newStatus ? 'enabled' : 'disabled'}` });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

// GET /api/central-admin/branches
const getBranches = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.branch_id, b.branch_name, b.branch_code, b.is_active,
              COUNT(DISTINCT s.section_id) AS section_count,
              COUNT(DISTINCT u.user_id) AS user_count
       FROM branches b
       LEFT JOIN sections s ON b.branch_id = s.branch_id
       LEFT JOIN users u    ON b.branch_id = u.branch_id AND u.is_active = TRUE
       GROUP BY b.branch_id
       ORDER BY b.branch_name`
    );
    return res.json({ success: true, branches: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/central-admin/branches - Add a branch
const addBranch = async (req, res) => {
  try {
    const adminId = req.session.user.user_id;
    const { branch_name, branch_code } = req.body;

    if (!branch_name || !branch_code) {
      return res.status(400).json({ success: false, message: 'Branch name and code required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO branches (branch_name, branch_code) VALUES (?,?)',
      [branch_name, branch_code.toUpperCase()]
    );

    await pool.execute(
      `INSERT INTO admin_actions (admin_id, admin_role, action_type, remarks)
       VALUES (?, 'central_admin', 'add_user', ?)`,
      [adminId, `Added branch: ${branch_name} (${branch_code})`]
    );

    return res.status(201).json({ success: true, message: 'Branch added', branch_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Branch code already exists' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/central-admin/logs
const getSystemLogs = async (req, res) => {
  try {
    const [logs] = await pool.execute(
      `SELECT aa.action_id, aa.action_type, aa.remarks, aa.action_time,
              u.name AS admin_name, r.role_name AS admin_role,
              tu.name AS target_name
       FROM admin_actions aa
       JOIN users u  ON aa.admin_id = u.user_id
       JOIN roles r  ON u.role_id   = r.role_id
       LEFT JOIN users tu ON aa.target_user_id = tu.user_id
       ORDER BY aa.action_time DESC
       LIMIT 200`
    );
    return res.json({ success: true, logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/central-admin/branch-admins - Add a branch admin
const addBranchAdmin = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const adminId = req.session.user.user_id;
    const { name, email, password, branch_id, phone } = req.body;

    if (!name || !email || !password || !branch_id) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const [exists] = await conn.execute('SELECT user_id FROM users WHERE email=?', [email.toLowerCase()]);
    if (exists.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const [[role]] = await conn.execute('SELECT role_id FROM roles WHERE role_name=?', ['branch_admin']);
    const hash     = await bcrypt.hash(password, 10);

    const [result] = await conn.execute(
      'INSERT INTO users (name, email, password_hash, role_id, branch_id, phone) VALUES (?,?,?,?,?,?)',
      [name, email.toLowerCase(), hash, role.role_id, branch_id, phone || null]
    );

    await conn.execute(
      `INSERT INTO admin_actions (admin_id, admin_role, action_type, target_user_id, branch_id, remarks)
       VALUES (?, 'central_admin', 'add_user', ?, ?, ?)`,
      [adminId, result.insertId, branch_id, `Added Branch Admin: ${name}`]
    );

    await conn.commit();
    return res.status(201).json({ success: true, message: 'Branch Admin added' });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

module.exports = {
  getDashboardStats, getPrincipals, addPrincipal, togglePrincipal,
  getBranches, addBranch, getSystemLogs, addBranchAdmin
};

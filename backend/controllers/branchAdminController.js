// controllers/branchAdminController.js
const { pool }    = require('../config/db');
const bcrypt      = require('bcryptjs');

const getDashboardStats = async (req, res) => {
  try {
    const branchId = req.session.user.branch_id;

    const [[userCount]]  = await pool.execute('SELECT COUNT(*) AS c FROM users WHERE branch_id=?', [branchId]);
    const [[reqCount]]   = await pool.execute(
      'SELECT COUNT(*) AS c FROM permission_requests pr JOIN users u ON pr.student_id=u.user_id WHERE u.branch_id=?',
      [branchId]
    );
    const [[pendCount]]  = await pool.execute(
      `SELECT COUNT(*) AS c FROM permission_requests pr JOIN users u ON pr.student_id=u.user_id
       WHERE u.branch_id=? AND pr.status='pending'`, [branchId]
    );

    return res.json({
      success: true,
      stats: { users: userCount.c, total_requests: reqCount.c, pending: pendCount.c }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getBranchUsers = async (req, res) => {
  try {
    const branchId = req.session.user.branch_id;

    const [rows] = await pool.execute(
      `SELECT u.user_id, u.name, u.email, u.phone, r.role_name,
              s.section_name, u.roll_number, u.is_active, u.is_assistant
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN sections s ON u.section_id = s.section_id
       WHERE u.branch_id = ?
       ORDER BY r.role_id, u.name`,
      [branchId]
    );

    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/branch-admin/users - Create a new user in this branch
const createUser = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const adminId  = req.session.user.user_id;
    const branchId = req.session.user.branch_id;

    const { name, email, password, role_name, section_id, roll_number, phone, is_assistant } = req.body;

    if (!name || !email || !password || !role_name) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });
    }

    // Only branch-level roles
    if (!['student', 'coordinator', 'hod'].includes(role_name)) {
      return res.status(400).json({ success: false, message: 'Branch Admin can only create student/coordinator/hod' });
    }

    // Check email exists
    const [exists] = await conn.execute('SELECT user_id FROM users WHERE email=?', [email.toLowerCase()]);
    if (exists.length > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const [[role]] = await conn.execute('SELECT role_id FROM roles WHERE role_name=?', [role_name]);
    const hash     = await bcrypt.hash(password, 10);

    const [result] = await conn.execute(
      `INSERT INTO users (name, email, password_hash, role_id, branch_id, section_id, roll_number, phone, is_assistant)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, email.toLowerCase(), hash, role.role_id, branchId,
       section_id || null, roll_number || null, phone || null, is_assistant || false]
    );

    await conn.execute(
      `INSERT INTO admin_actions (admin_id, admin_role, action_type, target_user_id, branch_id, remarks)
       VALUES (?, 'branch_admin', 'add_user', ?, ?, ?)`,
      [adminId, result.insertId, branchId, `Created ${role_name}: ${name}`]
    );

    await conn.commit();
    return res.status(201).json({ success: true, message: 'User created', user_id: result.insertId });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

// PATCH /api/branch-admin/users/:id/toggle - Enable / Disable user
const toggleUser = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const adminId  = req.session.user.user_id;
    const branchId = req.session.user.branch_id;
    const { id }   = req.params;

    const [rows] = await conn.execute(
      'SELECT user_id, is_active, name FROM users WHERE user_id=? AND branch_id=?',
      [id, branchId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'User not found in your branch' });
    }

    const newStatus = !rows[0].is_active;
    await conn.execute('UPDATE users SET is_active=? WHERE user_id=?', [newStatus, id]);

    await conn.execute(
      `INSERT INTO admin_actions (admin_id, admin_role, action_type, target_user_id, branch_id, remarks)
       VALUES (?, 'branch_admin', ?, ?, ?, ?)`,
      [adminId, newStatus ? 'enable_user' : 'disable_user', id, branchId,
       `${newStatus ? 'Enabled' : 'Disabled'} user: ${rows[0].name}`]
    );

    await conn.commit();
    return res.json({ success: true, message: `User ${newStatus ? 'enabled' : 'disabled'}` });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

// POST /api/branch-admin/override/:id - Override a permission decision
const overridePermission = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const adminId  = req.session.user.user_id;
    const branchId = req.session.user.branch_id;
    const { id }   = req.params;
    const { new_status, remarks } = req.body;

    if (!['approved', 'rejected'].includes(new_status)) {
      return res.status(400).json({ success: false, message: 'Override status must be approved or rejected' });
    }
    if (!remarks?.trim()) {
      return res.status(400).json({ success: false, message: 'Remarks required for override' });
    }

    // Verify the permission belongs to this branch
    const [rows] = await conn.execute(
      `SELECT pr.* FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE pr.request_id=? AND u.branch_id=?`,
      [id, branchId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Permission not found in your branch' });
    }

    await conn.execute(
      `UPDATE permission_requests SET status=?, current_holder_role='completed', current_holder_id=NULL
       WHERE request_id=?`,
      [new_status, id]
    );

    await conn.execute(
      `INSERT INTO approval_logs (request_id, action_by, action_role, action_type, remarks)
       VALUES (?, ?, 'branch_admin', 'override', ?)`,
      [id, adminId, remarks]
    );

    await conn.execute(
      `INSERT INTO admin_actions (admin_id, admin_role, action_type, branch_id, remarks)
       VALUES (?, 'branch_admin', 'override_permission', ?, ?)`,
      [adminId, branchId, `Overrode permission #${id} to ${new_status}: ${remarks}`]
    );

    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, request_id)
       VALUES (?, ?, ?, 'status_update', ?)`,
      [rows[0].student_id,
       `Admin Override — Permission ${new_status}`,
       `Your permission has been ${new_status} by Branch Admin. Remarks: ${remarks}`,
       id]
    );

    await conn.commit();
    return res.json({ success: true, message: 'Override applied successfully' });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

const getAllPermissions = async (req, res) => {
  try {
    const branchId = req.session.user.branch_id;

    const [rows] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.from_date, pr.to_date,
              pr.status, pr.current_holder_role, pr.created_at,
              u.name AS student_name, u.roll_number, s.section_name
       FROM permission_requests pr
       JOIN users u  ON pr.student_id = u.user_id
       JOIN sections s ON u.section_id = s.section_id
       WHERE u.branch_id = ?
       ORDER BY pr.created_at DESC`,
      [branchId]
    );

    return res.json({ success: true, permissions: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDashboardStats, getBranchUsers, createUser, toggleUser, overridePermission, getAllPermissions };

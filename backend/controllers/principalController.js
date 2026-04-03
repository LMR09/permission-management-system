// controllers/principalController.js
const { pool } = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const principalId = req.session.user.user_id;

    const [rows] = await pool.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(current_holder_id = ? AND status = 'pending') AS my_pending,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected
       FROM permission_requests`,
      [principalId]
    );

    const [recent] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.from_date, pr.to_date, pr.status,
              u.name AS student_name, u.roll_number, b.branch_name, s.section_name
       FROM permission_requests pr
       JOIN users u    ON pr.student_id = u.user_id
       JOIN branches b ON u.branch_id = b.branch_id
       JOIN sections s ON u.section_id = s.section_id
       WHERE pr.current_holder_id = ? AND pr.status = 'pending'
       ORDER BY pr.created_at ASC LIMIT 5`,
      [principalId]
    );

    return res.json({ success: true, stats: rows[0], recent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const principalId = req.session.user.user_id;

    const [rows] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.letter_type, pr.reason_summary,
              pr.from_date, pr.to_date, pr.letter_content,
              pr.attachment_type, pr.attachment_url, pr.created_at,
              u.name AS student_name, u.roll_number,
              b.branch_name, s.section_name
       FROM permission_requests pr
       JOIN users u    ON pr.student_id = u.user_id
       JOIN branches b ON u.branch_id = b.branch_id
       JOIN sections s ON u.section_id = s.section_id
       WHERE pr.current_holder_id = ? AND pr.status = 'pending'
       ORDER BY pr.created_at ASC`,
      [principalId]
    );

    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getHistory = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.from_date, pr.to_date,
              pr.status, pr.current_holder_role,
              u.name AS student_name, u.roll_number,
              b.branch_name, s.section_name, pr.updated_at
       FROM permission_requests pr
       JOIN users u    ON pr.student_id = u.user_id
       JOIN branches b ON u.branch_id = b.branch_id
       JOIN sections s ON u.section_id = s.section_id
       ORDER BY pr.updated_at DESC`
    );

    return res.json({ success: true, history: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const takeAction = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const principalId = req.session.user.user_id;
    const { id }      = req.params;
    const { action, remarks } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Principal can only approve or reject' });
    }

    const [rows] = await conn.execute(
      `SELECT * FROM permission_requests
       WHERE request_id = ? AND current_holder_id = ? AND status = 'pending'`,
      [id, principalId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = rows[0];
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await conn.execute(
      `UPDATE permission_requests
       SET status=?, current_holder_role='completed', current_holder_id=NULL
       WHERE request_id=?`,
      [newStatus, id]
    );

    await conn.execute(
      `INSERT INTO approval_logs (request_id, action_by, action_role, action_type, remarks)
       VALUES (?, ?, 'principal', ?, ?)`,
      [id, principalId, action === 'approve' ? 'approved' : 'rejected', remarks || null]
    );

    const notifyTitle = action === 'approve' ? '🎓 Permission Approved by Principal' : '❌ Permission Rejected by Principal';
    const notifyMsg   = action === 'approve'
      ? `Your permission "${request.subject}" has been officially approved by the Principal.`
      : `Your permission "${request.subject}" was rejected by the Principal. ${remarks ? 'Remarks: ' + remarks : ''}`;

    await conn.execute(
      `INSERT INTO notifications (user_id, title, message, type, request_id) VALUES (?,?,?,'status_update',?)`,
      [request.student_id, notifyTitle, notifyMsg, id]
    );

    await conn.commit();
    return res.json({ success: true, message: `Permission ${action}d by Principal` });

  } catch (err) {
    await conn.rollback();
    console.error('Principal action error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

module.exports = { getDashboardStats, getPendingRequests, getHistory, takeAction };

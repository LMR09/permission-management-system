// controllers/hodController.js
const { pool } = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const userId   = req.session.user.user_id;
    const branchId = req.session.user.branch_id;

    const [rows] = await pool.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(pr.current_holder_id = ? AND pr.status = 'pending') AS my_pending,
        SUM(pr.status = 'approved') AS approved,
        SUM(pr.status = 'rejected') AS rejected
       FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE u.branch_id = ?`,
      [userId, branchId]
    );

    const [recent] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.from_date, pr.to_date,
              pr.status, u.name AS student_name, u.roll_number,
              s.section_name
       FROM permission_requests pr
       JOIN users u  ON pr.student_id = u.user_id
       JOIN sections s ON u.section_id = s.section_id
       WHERE u.branch_id = ? AND pr.current_holder_id = ? AND pr.status = 'pending'
       ORDER BY pr.created_at ASC LIMIT 5`,
      [branchId, userId]
    );

    return res.json({ success: true, stats: rows[0], recent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const userId   = req.session.user.user_id;
    const branchId = req.session.user.branch_id;

    const [rows] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.letter_type, pr.reason_summary,
              pr.from_date, pr.to_date, pr.letter_content,
              pr.attachment_type, pr.attachment_url, pr.created_at,
              u.name AS student_name, u.roll_number, s.section_name
       FROM permission_requests pr
       JOIN users u  ON pr.student_id = u.user_id
       JOIN sections s ON u.section_id = s.section_id
       WHERE u.branch_id = ? AND pr.current_holder_id = ? AND pr.status = 'pending'
       ORDER BY pr.created_at ASC`,
      [branchId, userId]
    );

    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getHistory = async (req, res) => {
  try {
    const branchId = req.session.user.branch_id;

    const [rows] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.from_date, pr.to_date,
              pr.status, pr.current_holder_role,
              u.name AS student_name, u.roll_number, s.section_name, pr.updated_at
       FROM permission_requests pr
       JOIN users u  ON pr.student_id = u.user_id
       JOIN sections s ON u.section_id = s.section_id
       WHERE u.branch_id = ?
       ORDER BY pr.updated_at DESC`,
      [branchId]
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

    const hodId    = req.session.user.user_id;
    const branchId = req.session.user.branch_id;
    const { id }   = req.params;
    const { action, remarks } = req.body;

    if (!['approve', 'reject', 'return', 'forward_principal'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    if (['reject', 'return', 'forward_principal'].includes(action) && !remarks?.trim()) {
      return res.status(400).json({ success: false, message: 'Remarks required' });
    }

    // Verify request
    const [rows] = await conn.execute(
      `SELECT pr.* FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE pr.request_id = ? AND u.branch_id = ?
         AND pr.current_holder_id = ? AND pr.status = 'pending'`,
      [id, branchId, hodId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = rows[0];
    let newStatus = 'pending', newHolderRole = 'hod', newHolderId = hodId;
    let logActionType = action, forwardedTo = null;
    let notifyUserId = request.student_id;
    let notifyTitle = '', notifyMsg = '';

    if (action === 'approve') {
      newStatus = 'approved'; newHolderRole = 'completed'; newHolderId = null;
      logActionType = 'approved';
      notifyTitle = '✅ Permission Approved by HOD';
      notifyMsg   = `Your permission "${request.subject}" has been approved by the HOD.`;
    }
    else if (action === 'reject') {
      newStatus = 'rejected'; newHolderRole = 'completed'; newHolderId = null;
      logActionType = 'rejected';
      notifyTitle = '❌ Permission Rejected by HOD';
      notifyMsg   = `Your permission "${request.subject}" was rejected by HOD. Remarks: ${remarks}`;
    }
    else if (action === 'return') {
      newStatus = 'returned'; newHolderRole = 'hod'; newHolderId = hodId;
      logActionType = 'returned';
      notifyTitle = '🔁 Permission Returned by HOD';
      notifyMsg   = `Your permission "${request.subject}" was returned for correction. Remarks: ${remarks}`;
    }
    else if (action === 'forward_principal') {
      // Find Principal
      const [principals] = await conn.execute(
        `SELECT u.user_id FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE r.role_name = 'principal' AND u.is_active = TRUE LIMIT 1`
      );

      if (principals.length === 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'No active Principal found' });
      }

      newStatus = 'pending'; newHolderRole = 'principal'; newHolderId = principals[0].user_id;
      logActionType = 'forwarded'; forwardedTo = 'principal';
      notifyUserId  = principals[0].user_id;
      notifyTitle   = '📨 Permission Forwarded from HOD';
      notifyMsg     = `HOD forwarded a permission from ${req.session.user.name}'s branch: "${request.subject}"`;
    }

    await conn.execute(
      'UPDATE permission_requests SET status=?, current_holder_role=?, current_holder_id=? WHERE request_id=?',
      [newStatus, newHolderRole, newHolderId, id]
    );

    await conn.execute(
      `INSERT INTO approval_logs (request_id, action_by, action_role, action_type, remarks, forwarded_to)
       VALUES (?, ?, 'hod', ?, ?, ?)`,
      [id, hodId, logActionType, remarks || null, forwardedTo]
    );

    if (notifyTitle) {
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, request_id) VALUES (?,?,?,'status_update',?)`,
        [notifyUserId, notifyTitle, notifyMsg, id]
      );
      // Also notify student if not already
      if (notifyUserId !== request.student_id && ['approved','rejected','returned'].includes(action)) {
        await conn.execute(
          `INSERT INTO notifications (user_id, title, message, type, request_id) VALUES (?,?,?,'status_update',?)`,
          [request.student_id, notifyTitle, notifyMsg, id]
        );
      }
    }

    await conn.commit();
    return res.json({ success: true, message: `Action: ${action} applied` });

  } catch (err) {
    await conn.rollback();
    console.error('HOD action error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

module.exports = { getDashboardStats, getPendingRequests, getHistory, takeAction };

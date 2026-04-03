// controllers/coordinatorController.js
const { pool } = require('../config/db');

// GET /api/coordinator/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    const userId    = req.session.user.user_id;
    const sectionId = req.session.user.section_id;

    const [rows] = await pool.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(current_holder_id = ? AND status = 'pending') AS my_pending,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected
       FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE u.section_id = ?`,
      [userId, sectionId]
    );

    const [recent] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.from_date, pr.to_date,
              pr.status, pr.current_holder_role,
              u.name AS student_name, u.roll_number
       FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE u.section_id = ? AND pr.current_holder_id = ? AND pr.status = 'pending'
       ORDER BY pr.created_at ASC
       LIMIT 5`,
      [sectionId, userId]
    );

    return res.json({ success: true, stats: rows[0], recent });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/coordinator/pending
const getPendingRequests = async (req, res) => {
  try {
    const userId    = req.session.user.user_id;
    const sectionId = req.session.user.section_id;

    const [rows] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.letter_type, pr.reason_summary,
              pr.from_date, pr.to_date, pr.attachment_type,
              pr.letter_content, pr.created_at,
              u.name AS student_name, u.roll_number
       FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE u.section_id = ?
         AND pr.current_holder_id = ?
         AND pr.status = 'pending'
       ORDER BY pr.created_at ASC`,
      [sectionId, userId]
    );

    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/coordinator/history
const getHistory = async (req, res) => {
  try {
    const sectionId = req.session.user.section_id;

    const [rows] = await pool.execute(
      `SELECT pr.request_id, pr.subject, pr.from_date, pr.to_date,
              pr.status, pr.current_holder_role,
              u.name AS student_name, u.roll_number, pr.updated_at
       FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE u.section_id = ? AND pr.status != 'pending'
       ORDER BY pr.updated_at DESC`,
      [sectionId]
    );

    return res.json({ success: true, history: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/coordinator/action/:id
const takeAction = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const coordinatorId = req.session.user.user_id;
    const sectionId     = req.session.user.section_id;
    const branchId      = req.session.user.branch_id;
    const { id }        = req.params;
    const { action, remarks } = req.body;

    // Validate action
    if (!['approve', 'reject', 'return', 'forward_hod'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    if (['reject', 'return', 'forward_hod'].includes(action) && !remarks?.trim()) {
      return res.status(400).json({ success: false, message: 'Remarks are required for this action' });
    }

    // Verify request belongs to this coordinator
    const [rows] = await conn.execute(
      `SELECT pr.* FROM permission_requests pr
       JOIN users u ON pr.student_id = u.user_id
       WHERE pr.request_id = ? AND u.section_id = ?
         AND pr.current_holder_id = ? AND pr.status = 'pending'`,
      [id, sectionId, coordinatorId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Request not found or already actioned' });
    }

    const request = rows[0];

    // Mark as viewed
    await conn.execute(
      'UPDATE permission_requests SET viewed_by_coordinator = TRUE WHERE request_id = ?',
      [id]
    );

    let newStatus = 'pending';
    let newHolderRole = 'coordinator';
    let newHolderId = coordinatorId;
    let logActionType = action;
    let forwardedTo = null;
    let notifyUserId = request.student_id;
    let notifyTitle = '';
    let notifyMsg = '';

    if (action === 'approve') {
      newStatus = 'approved';
      newHolderRole = 'completed';
      newHolderId = null;
      logActionType = 'approved';
      notifyTitle = '✅ Permission Approved';
      notifyMsg   = `Your permission "${request.subject}" has been approved by your Coordinator.`;
    }
    else if (action === 'reject') {
      newStatus = 'rejected';
      newHolderRole = 'completed';
      newHolderId = null;
      logActionType = 'rejected';
      notifyTitle = '❌ Permission Rejected';
      notifyMsg   = `Your permission "${request.subject}" was rejected by your Coordinator. Remarks: ${remarks}`;
    }
    else if (action === 'return') {
      newStatus = 'returned';
      newHolderRole = 'coordinator';
      newHolderId = coordinatorId;
      logActionType = 'returned';
      notifyTitle = '🔁 Permission Returned';
      notifyMsg   = `Your permission "${request.subject}" was returned for correction. Remarks: ${remarks}`;
    }
    else if (action === 'forward_hod') {
      // Find HOD of this branch
      const [hods] = await conn.execute(
        `SELECT u.user_id FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE r.role_name = 'hod' AND u.branch_id = ? AND u.is_active = TRUE
         ORDER BY u.is_assistant ASC
         LIMIT 1`,
        [branchId]
      );

      if (hods.length === 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'No HOD found for this branch' });
      }

      newStatus     = 'pending';
      newHolderRole = 'hod';
      newHolderId   = hods[0].user_id;
      logActionType = 'forwarded';
      forwardedTo   = 'hod';
      notifyUserId  = hods[0].user_id;
      notifyTitle   = '📨 New Permission Forwarded';
      notifyMsg     = `Coordinator forwarded a permission from ${req.session.user.name}'s student: "${request.subject}"`;
    }

    // Update request
    await conn.execute(
      `UPDATE permission_requests
       SET status = ?, current_holder_role = ?, current_holder_id = ?
       WHERE request_id = ?`,
      [newStatus, newHolderRole, newHolderId, id]
    );

    // Log action
    await conn.execute(
      `INSERT INTO approval_logs
        (request_id, action_by, action_role, action_type, remarks, forwarded_to)
       VALUES (?, ?, 'coordinator', ?, ?, ?)`,
      [id, coordinatorId, logActionType, remarks || null, forwardedTo]
    );

    // Notify relevant person
    if (notifyTitle) {
      await conn.execute(
        `INSERT INTO notifications (user_id, title, message, type, request_id)
         VALUES (?, ?, ?, 'status_update', ?)`,
        [notifyUserId, notifyTitle, notifyMsg, id]
      );
    }

    await conn.commit();

    return res.json({
      success: true,
      message: `Permission ${action.replace('_', ' ')} successfully`
    });

  } catch (err) {
    await conn.rollback();
    console.error('Coordinator action error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

module.exports = { getDashboardStats, getPendingRequests, getHistory, takeAction };

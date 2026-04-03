// controllers/studentController.js
const { pool } = require('../config/db');

// GET /api/student/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    const studentId = req.session.user.user_id;

    const [rows] = await pool.execute(
      `SELECT
        COUNT(*) AS total,
        SUM(status = 'pending')  AS pending,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected,
        SUM(status = 'returned') AS returned
       FROM permission_requests
       WHERE student_id = ?`,
      [studentId]
    );

    const [recent] = await pool.execute(
      `SELECT request_id, subject, from_date, to_date, status, current_holder_role, created_at
       FROM permission_requests
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [studentId]
    );

    // Format dates
    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '';
    const recentFormatted = recent.map(r => ({
      ...r,
      from_date: fmt(r.from_date),
      to_date:   fmt(r.to_date)
    }));

    return res.json({
      success: true,
      stats: {
        total:    rows[0].total    || 0,
        pending:  rows[0].pending  || 0,
        approved: rows[0].approved || 0,
        rejected: rows[0].rejected || 0,
        returned: rows[0].returned || 0
      },
      recent: recentFormatted
    });

  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/student/permissions - Submit new permission
const createPermission = async (req, res) => {
  try {
    const studentId = req.session.user.user_id;
    const sectionId = req.session.user.section_id;

    const {
      subject, event_name, reason_summary,
      from_date, to_date, periods_affected,
      letter_type, letter_content,
      attachment_type, attachment_url
    } = req.body;

    // Validate required fields
    if (!subject || !reason_summary || !from_date || !to_date || !letter_type || !letter_content) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Find the coordinator for this section
    const [coordinators] = await pool.execute(
      `SELECT u.user_id FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role_name = 'coordinator' AND u.section_id = ? AND u.is_active = TRUE
       LIMIT 1`,
      [sectionId]
    );

    const coordinatorId = coordinators.length > 0 ? coordinators[0].user_id : null;

    // Insert permission request
    const [result] = await pool.execute(
      `INSERT INTO permission_requests
        (student_id, letter_type, subject, letter_content, reason_summary,
         from_date, to_date, periods_affected,
         current_holder_role, current_holder_id,
         status, attachment_type, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'coordinator', ?, 'pending', ?, ?)`,
      [
        studentId, letter_type, subject, letter_content, reason_summary,
        from_date, to_date, periods_affected || null,
        coordinatorId,
        attachment_type || 'none',
        attachment_url || null
      ]
    );

    const requestId = result.insertId;

    // Log the submission
    await pool.execute(
      `INSERT INTO approval_logs
        (request_id, action_by, action_role, action_type, remarks)
       VALUES (?, ?, 'coordinator', 'submitted', ?)`,
      [requestId, studentId, `Permission submitted by student for: ${subject}`]
    );

    // Notify coordinator if exists
    if (coordinatorId) {
      await pool.execute(
        `INSERT INTO notifications (user_id, title, message, type, request_id)
         VALUES (?, ?, ?, 'status_update', ?)`,
        [
          coordinatorId,
          'New Permission Request',
          `${req.session.user.name} has submitted a new permission request: "${subject}"`,
          requestId
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Permission submitted successfully',
      request_id: requestId
    });

  } catch (err) {
    console.error('Create permission error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/permissions - List all permissions for student
const getMyPermissions = async (req, res) => {
  try {
    const studentId = req.session.user.user_id;

    const [rows] = await pool.execute(
      `SELECT
        request_id, subject, letter_type, reason_summary,
        from_date, to_date, status,
        current_holder_role, attachment_type, attachment_url,
        viewed_by_coordinator, created_at
       FROM permission_requests
       WHERE student_id = ?
       ORDER BY created_at DESC`,
      [studentId]
    );

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '';
    const formatted = rows.map(r => ({
      ...r,
      from_date:  fmt(r.from_date),
      to_date:    fmt(r.to_date),
      created_at: new Date(r.created_at).toLocaleDateString('en-IN')
    }));

    return res.json({ success: true, permissions: formatted });

  } catch (err) {
    console.error('Get permissions error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/permissions/:id/logs - Get approval trail
const getPermissionLogs = async (req, res) => {
  try {
    const studentId = req.session.user.user_id;
    const { id } = req.params;

    // Verify ownership
    const [check] = await pool.execute(
      'SELECT request_id FROM permission_requests WHERE request_id = ? AND student_id = ?',
      [id, studentId]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const [logs] = await pool.execute(
      `SELECT
        al.action_role, al.action_type, al.remarks, al.action_time,
        u.name AS actor_name
       FROM approval_logs al
       JOIN users u ON al.action_by = u.user_id
       WHERE al.request_id = ?
       ORDER BY al.action_time ASC`,
      [id]
    );

    const roleLabels = {
      coordinator:   'Class Coordinator',
      hod:           'HOD',
      principal:     'Principal',
      branch_admin:  'Branch Admin',
      central_admin: 'Central Admin'
    };

    const actionLabels = {
      submitted:  'Submitted',
      viewed:     'Viewed',
      approved:   'Approved',
      rejected:   'Rejected',
      returned:   'Returned',
      forwarded:  'Forwarded',
      edited:     'Edited',
      override:   'Overridden'
    };

    const formatted = logs.map(l => ({
      ...l,
      action_role_label: roleLabels[l.action_role] || l.action_role,
      action_type_label: actionLabels[l.action_type] || l.action_type,
      action_time: new Date(l.action_time).toLocaleString('en-IN')
    }));

    return res.json({ success: true, logs: formatted });

  } catch (err) {
    console.error('Get logs error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/student/permissions/:id/pdf - Download approved PDF
const downloadPDF = async (req, res) => {
  try {
    const studentId = req.session.user.user_id;
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT pr.*, u.name, u.roll_number,
              b.branch_name, s.section_name
       FROM permission_requests pr
       JOIN users u  ON pr.student_id = u.user_id
       JOIN branches b ON u.branch_id = b.branch_id
       JOIN sections s ON u.section_id = s.section_id
       WHERE pr.request_id = ? AND pr.student_id = ? AND pr.status = 'approved'`,
      [id, studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Approved permission not found' });
    }

    const permission = rows[0];

    // Get approval trail
    const [logs] = await pool.execute(
      `SELECT al.action_role, al.action_type, al.remarks, al.action_time, u.name
       FROM approval_logs al
       JOIN users u ON al.action_by = u.user_id
       WHERE al.request_id = ? AND al.action_type IN ('approved', 'forwarded')
       ORDER BY al.action_time ASC`,
      [id]
    );

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 60 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="permission_${id}.pdf"`
    );

    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold')
       .text("Vignan's Institute of Information Technology", { align: 'center' });
    doc.fontSize(12).font('Helvetica')
       .text('Duvvada, Visakhapatnam, Andhra Pradesh', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(60, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font('Helvetica-Bold')
       .text('PERMISSION APPROVAL LETTER', { align: 'center' });
    doc.moveDown(1);

    // Student details
    doc.fontSize(11).font('Helvetica');
    doc.text(`Student Name  : ${permission.name}`);
    doc.text(`Roll Number   : ${permission.roll_number}`);
    doc.text(`Branch        : ${permission.branch_name}`);
    doc.text(`Section       : ${permission.section_name}`);
    doc.text(`Valid From    : ${new Date(permission.from_date).toLocaleDateString('en-IN')}`);
    doc.text(`Valid Until   : ${new Date(permission.to_date).toLocaleDateString('en-IN')}`);
    doc.moveDown(1);

    // Letter content
    doc.moveTo(60, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(permission.letter_content, { lineGap: 3 });
    doc.moveDown(1);

    // Approval trail
    doc.moveTo(60, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text('APPROVAL TRAIL');
    doc.moveDown(0.5);

    logs.forEach(log => {
      doc.fontSize(10).font('Helvetica')
         .text(`✓ ${log.name} (${log.action_role})  —  ${log.action_type.toUpperCase()}  —  ${new Date(log.action_time).toLocaleString('en-IN')}`);
      if (log.remarks) {
        doc.fontSize(9).fillColor('#555').text(`  Remarks: ${log.remarks}`).fillColor('black');
      }
    });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#888')
       .text(`This is a digitally processed permission letter generated by the Permission Management System.`, { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
};

module.exports = {
  getDashboardStats,
  createPermission,
  getMyPermissions,
  getPermissionLogs,
  downloadPDF
};

// src/components/common/ApprovalPanel.jsx
// Reusable request review + action panel used by Coordinator, HOD, Principal
import { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './ApprovalPanel.css';

const ApprovalPanel = ({ request, role, onActionDone }) => {
  const [action,  setAction]  = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Actions available per role
  const actions = {
    coordinator: [
      { key: 'approve',     label: '✅ Approve',          cls: 'btn-success' },
      { key: 'reject',      label: '❌ Reject',            cls: 'btn-danger'  },
      { key: 'return',      label: '🔁 Return',            cls: 'btn-warning' },
      { key: 'forward_hod', label: '⏭️ Forward to HOD',   cls: 'btn-primary' }
    ],
    hod: [
      { key: 'approve',              label: '✅ Approve',                 cls: 'btn-success' },
      { key: 'reject',               label: '❌ Reject',                   cls: 'btn-danger'  },
      { key: 'return',               label: '🔁 Return',                   cls: 'btn-warning' },
      { key: 'forward_principal',    label: '⏭️ Forward to Principal',    cls: 'btn-primary' }
    ],
    principal: [
      { key: 'approve', label: '✅ Final Approve', cls: 'btn-success' },
      { key: 'reject',  label: '❌ Reject',         cls: 'btn-danger'  }
    ]
  };

  const remarksRequired = ['reject', 'return', 'forward_hod', 'forward_principal'];

  const handleSubmit = async () => {
    if (!action) { toast.error('Select an action first'); return; }
    if (remarksRequired.includes(action) && !remarks.trim()) {
      toast.error('Remarks are required for this action'); return;
    }

    setLoading(true);
    try {
      const endpoint = `/${role}/action/${request.request_id}`;
      const res = await api.post(endpoint, { action, remarks });
      if (res.data.success) {
        toast.success(res.data.message);
        onActionDone();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="approval-panel">
      {/* Header */}
      <div className="ap-header" onClick={() => setExpanded(e => !e)}>
        <div className="ap-title-row">
          <div>
            <div className="ap-subject">{request.subject}</div>
            <div className="ap-meta">
              👤 {request.student_name} &nbsp;·&nbsp; {request.roll_number}
              {request.section_name && <>&nbsp;·&nbsp; Sec {request.section_name}</>}
              {request.branch_name  && <>&nbsp;·&nbsp; {request.branch_name}</>}
            </div>
            <div className="ap-dates">
              📅 {new Date(request.from_date).toLocaleDateString('en-IN')} →
              {new Date(request.to_date).toLocaleDateString('en-IN')}
              &nbsp;·&nbsp;
              {request.letter_type === 'ai' ? '🤖 AI Generated' : '✍️ Manual'}
            </div>
          </div>
          <span className="ap-expand-icon">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="ap-body">
          {/* Letter */}
          <div className="ap-section">
            <h4>Permission Letter</h4>
            <pre className="ap-letter">{request.letter_content}</pre>
          </div>

          {/* Attachment */}
          {request.attachment_type && request.attachment_type !== 'none' && (
            <div className="ap-section">
              <h4>Attachment</h4>
              {request.attachment_type === 'drive_link' ? (
                <a href={request.attachment_url} target="_blank" rel="noreferrer" className="drive-link-btn">
                  🔗 Open Document
                </a>
              ) : (
                <span>File attached</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Zone — always visible */}
      <div className="ap-actions">
        <div className="action-buttons">
          {(actions[role] || []).map(a => (
            <button
              key={a.key}
              className={`btn ${a.cls} ${action === a.key ? 'selected' : ''}`}
              onClick={() => setAction(prev => prev === a.key ? '' : a.key)}
              disabled={loading}
            >
              {a.label}
            </button>
          ))}
        </div>

        {action && (
          <div className="remarks-row">
            <textarea
              className="form-control"
              rows={2}
              placeholder={
                remarksRequired.includes(action)
                  ? 'Remarks are required for this action...'
                  : 'Add remarks (optional)...'
              }
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
            <button
              className="btn btn-primary submit-action-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalPanel;

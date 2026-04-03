// src/pages/student/MyPermissions.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './MyPermissions.css';

const statusBadge = (status) => {
  const map = {
    pending:  { cls: 'badge-pending',  label: 'Pending'  },
    approved: { cls: 'badge-approved', label: 'Approved' },
    rejected: { cls: 'badge-rejected', label: 'Rejected' },
    returned: { cls: 'badge-returned', label: 'Returned' }
  };
  const s = map[status] || { cls: '', label: status };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

const holderLabel = (role) => {
  const map = {
    coordinator: '👨‍🏫 Class Coordinator',
    hod:         '👨‍💼 HOD',
    principal:   '🎓 Principal',
    completed:   '✅ Completed'
  };
  return map[role] || role;
};

// Approval timeline within a request
const ApprovalTimeline = ({ logs }) => {
  if (!logs || logs.length === 0) return null;
  return (
    <div className="approval-timeline">
      <h4>Approval Trail</h4>
      {logs.map((log, i) => (
        <div key={i} className={`timeline-item ${log.action_type}`}>
          <div className="tl-dot" />
          <div className="tl-body">
            <div className="tl-action">
              <strong>{log.action_role_label}</strong>
              &nbsp;
              <span className={`tl-type ${log.action_type}`}>{log.action_type_label}</span>
            </div>
            {log.remarks && (
              <div className="tl-remarks">💬 {log.remarks}</div>
            )}
            <div className="tl-time">{log.action_time}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Full request detail modal
const RequestModal = ({ request, onClose }) => {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/student/permissions/${request.request_id}/logs`);
        if (res.data.success) setLogs(res.data.logs);
      } catch { /* silent */ }
    };
    fetchLogs();
  }, [request.request_id]);

  const handleDownloadPDF = async () => {
    try {
      const res = await api.get(`/student/permissions/${request.request_id}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `permission_${request.request_id}.pdf`;
      a.click();
    } catch {
      toast.error('PDF not available yet');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{request.subject}</h3>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.3rem' }}>✕</button>
        </div>
        <div className="modal-body">
          {/* Meta info */}
          <div className="request-meta-grid">
            <div><span className="meta-label">Status</span>{statusBadge(request.status)}</div>
            <div><span className="meta-label">Currently With</span><span className="holder-chip">{holderLabel(request.current_holder_role)}</span></div>
            <div><span className="meta-label">From</span>{request.from_date}</div>
            <div><span className="meta-label">To</span>{request.to_date}</div>
            <div><span className="meta-label">Letter Type</span>
              <span>{request.letter_type === 'ai' ? '🤖 AI Generated' : '✍️ Manual'}</span>
            </div>
            {request.attachment_type !== 'none' && (
              <div>
                <span className="meta-label">Attachment</span>
                {request.attachment_type === 'drive_link'
                  ? <a href={request.attachment_url} target="_blank" rel="noreferrer" className="drive-link">🔗 View Document</a>
                  : <span>File attached</span>
                }
              </div>
            )}
          </div>

          {/* Letter */}
          <div className="letter-box">
            <h4>Permission Letter</h4>
            <pre className="letter-preview">{request.letter_content}</pre>
          </div>

          {/* Approval Trail */}
          <ApprovalTimeline logs={logs} />
        </div>
        <div className="modal-footer">
          {request.status === 'approved' && (
            <button className="btn btn-success" onClick={handleDownloadPDF}>
              📥 Download PDF
            </button>
          )}
          {request.status === 'returned' && !request.viewed_by_coordinator && (
            <button
              className="btn btn-warning"
              onClick={() => { onClose(); /* navigate to edit */ }}
            >
              ✏️ Edit & Resubmit
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const MyPermissions = () => {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await api.get('/student/permissions');
        if (res.data.success) setPermissions(res.data.permissions);
      } catch {
        toast.error('Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  const filtered = filter === 'all'
    ? permissions
    : permissions.filter(p => p.status === filter);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Permissions</h1>
        <p className="page-subtitle">Track all your permission requests</p>
      </div>

      {/* Filters + New Button */}
      <div className="filter-bar">
        <div className="filter-tabs">
          {['all', 'pending', 'approved', 'rejected', 'returned'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/student/new-permission')}
        >
          ➕ New
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">📭</div>
          <p>{filter === 'all' ? 'No permission requests yet.' : `No ${filter} requests.`}</p>
        </div>
      ) : (
        <div className="permissions-list">
          {filtered.map(p => (
            <div
              key={p.request_id}
              className="permission-card card"
              onClick={() => setSelected(p)}
            >
              <div className="pcard-left">
                <div className="pcard-subject">{p.subject}</div>
                <div className="pcard-meta">
                  📅 {p.from_date} → {p.to_date}
                  &nbsp;·&nbsp;
                  {p.letter_type === 'ai' ? '🤖 AI' : '✍️ Manual'}
                </div>
                {p.status === 'returned' && (
                  <div className="returned-notice">⚠️ Returned — needs correction</div>
                )}
              </div>
              <div className="pcard-right">
                {statusBadge(p.status)}
                <div className="pcard-holder">{holderLabel(p.current_holder_role)}</div>
                <div className="pcard-date">
                  {new Date(p.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <RequestModal
          request={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default MyPermissions;

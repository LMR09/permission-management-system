// src/pages/hod/HODDashboard.jsx
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import ApprovalPanel from '../../components/common/ApprovalPanel';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats]   = useState({ total: 0, my_pending: 0, approved: 0, rejected: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hod/dashboard-stats')
      .then(r => { if (r.data.success) { setStats(r.data.stats); setRecent(r.data.recent); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          {user?.is_assistant ? 'Assistant HOD' : 'HOD'} Dashboard
        </h1>
        <p className="page-subtitle">{user?.branch_name}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total in Branch</div>
          <div className="stat-value">{loading ? '—' : stats.total}</div></div>
        <div className="stat-card"><div className="stat-label">Awaiting My Review</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{loading ? '—' : stats.my_pending}</div></div>
        <div className="stat-card"><div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{loading ? '—' : stats.approved}</div></div>
        <div className="stat-card"><div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{loading ? '—' : stats.rejected}</div></div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
          Forwarded by Coordinators
        </h2>
        {loading ? <div className="empty-state"><p>Loading...</p></div>
        : recent.length === 0
          ? <div className="empty-state"><div className="icon">✅</div><p>No pending requests forwarded to you.</p></div>
          : <div className="table-wrapper">
              <table>
                <thead><tr><th>Student</th><th>Section</th><th>Subject</th><th>From</th><th>To</th></tr></thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.request_id}>
                      <td><strong>{r.student_name}</strong><br/><small>{r.roll_number}</small></td>
                      <td>{r.section_name}</td>
                      <td>{r.subject}</td>
                      <td>{new Date(r.from_date).toLocaleDateString('en-IN')}</td>
                      <td>{new Date(r.to_date).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
};

const PendingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  const fetchRequests = () => {
    setLoading(true);
    api.get('/hod/pending')
      .then(r => { if (r.data.success) setRequests(r.data.requests); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchRequests, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pending Requests</h1>
        <p className="page-subtitle">Requests forwarded from Class Coordinators</p>
      </div>

      {loading ? <div className="empty-state"><p>Loading...</p></div>
      : requests.length === 0
        ? <div className="card empty-state"><div className="icon">✅</div><p>No pending requests.</p></div>
        : requests.map(r => (
            <ApprovalPanel key={r.request_id} request={r} role="hod" onActionDone={fetchRequests} />
          ))
      }
    </div>
  );
};

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hod/history')
      .then(r => { if (r.data.success) setHistory(r.data.history); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const badge = (s) => {
    const m = { approved: 'badge-approved', rejected: 'badge-rejected',
                pending: 'badge-pending', returned: 'badge-returned' };
    return <span className={`badge ${m[s] || ''}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Permissions History</h1>
        <p className="page-subtitle">All permissions from your branch</p>
      </div>

      {loading ? <div className="empty-state"><p>Loading...</p></div>
      : history.length === 0
        ? <div className="card empty-state"><div className="icon">📂</div><p>No history yet.</p></div>
        : <div className="table-wrapper card">
            <table>
              <thead><tr><th>Student</th><th>Section</th><th>Subject</th><th>Dates</th><th>Status</th></tr></thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.request_id}>
                    <td><strong>{r.student_name}</strong><br/><small>{r.roll_number}</small></td>
                    <td>{r.section_name}</td>
                    <td>{r.subject}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {new Date(r.from_date).toLocaleDateString('en-IN')} → {new Date(r.to_date).toLocaleDateString('en-IN')}
                    </td>
                    <td>{badge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
};

const HODDashboard = () => (
  <div className="page-layout">
    <Sidebar />
    <main className="main-content">
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="pending"   element={<PendingRequests />} />
        <Route path="history"   element={<History />} />
        <Route path="*"         element={<DashboardHome />} />
      </Routes>
    </main>
  </div>
);

export default HODDashboard;

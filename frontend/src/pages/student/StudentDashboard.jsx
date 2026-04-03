// src/pages/student/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import NewPermission from './NewPermission';
import MyPermissions from './MyPermissions';
import './StudentDashboard.css';

// ── Dashboard Home ────────────────────────────────────────────
const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/student/dashboard-stats');
        if (res.data.success) {
          setStats(res.data.stats);
          setRecent(res.data.recent);
        }
      } catch {
        // stats stay at default
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
      coordinator: 'With Coordinator',
      hod:         'With HOD',
      principal:   'With Principal',
      completed:   'Completed'
    };
    return map[role] || role;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">
          {user?.branch_name} &nbsp;|&nbsp; Section {user?.section_name} &nbsp;|&nbsp; {user?.roll_number}
        </p>
      </div>

      {/* Quick Action */}
      <div className="quick-action-banner">
        <div>
          <h3>Need a Permission?</h3>
          <p>Submit a new permission request with AI-assisted letter writing</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/student/new-permission')}
        >
          ➕ New Permission
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{loading ? '—' : stats.total}</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{loading ? '—' : stats.pending}</div>
        </div>
        <div className="stat-card stat-approved">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{loading ? '—' : stats.approved}</div>
        </div>
        <div className="stat-card stat-rejected">
          <div className="stat-label">Rejected</div>
          <div className="stat-value">{loading ? '—' : stats.rejected}</div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">Recent Permissions</h2>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/student/my-permissions')}
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : recent.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No permissions submitted yet.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={() => navigate('/student/new-permission')}
            >
              Submit First Permission
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Currently With</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr
                    key={r.request_id}
                    className="clickable-row"
                    onClick={() => navigate(`/student/my-permissions`)}
                  >
                    <td className="subject-cell">{r.subject}</td>
                    <td>{r.from_date}</td>
                    <td>{r.to_date}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      <span className="holder-chip">
                        {holderLabel(r.current_holder_role)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Dashboard Shell ──────────────────────────────────────
const StudentDashboard = () => {
  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="dashboard"      element={<DashboardHome />} />
          <Route path="new-permission" element={<NewPermission />} />
          <Route path="my-permissions" element={<MyPermissions />} />
          <Route path="*"              element={<DashboardHome />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;

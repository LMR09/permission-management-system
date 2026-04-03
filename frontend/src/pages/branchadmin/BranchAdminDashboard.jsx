// src/pages/branchadmin/BranchAdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// ── Dashboard Home ────────────────────────────────────────────
const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, total_requests: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/branch-admin/dashboard-stats')
      .then(r => { if (r.data.success) setStats(r.data.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Branch Admin Dashboard</h1>
        <p className="page-subtitle">{user?.branch_name}</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Users in Branch</div>
          <div className="stat-value">{loading ? '—' : stats.users}</div></div>
        <div className="stat-card"><div className="stat-label">Total Requests</div>
          <div className="stat-value">{loading ? '—' : stats.total_requests}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{loading ? '—' : stats.pending}</div></div>
      </div>
    </div>
  );
};

// ── Manage Users ──────────────────────────────────────────────
const ManageUsers = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role_name: 'student',
    section_id: '', roll_number: '', phone: '', is_assistant: false
  });

  const fetchUsers = () => {
    setLoading(true);
    api.get('/branch-admin/users')
      .then(r => { if (r.data.success) setUsers(r.data.users); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    // Fetch sections for this branch
    api.get('/branch-admin/users').then(() => {}).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/branch-admin/users', form);
      if (res.data.success) {
        toast.success('User created successfully');
        setShowForm(false);
        setForm({ name: '', email: '', password: '', role_name: 'student',
                  section_id: '', roll_number: '', phone: '', is_assistant: false });
        fetchUsers();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggle = async (userId, name, isActive) => {
    if (!window.confirm(`${isActive ? 'Disable' : 'Enable'} user "${name}"?`)) return;
    try {
      const res = await api.patch(`/branch-admin/users/${userId}/toggle`);
      if (res.data.success) { toast.success(res.data.message); fetchUsers(); }
      else toast.error(res.data.message);
    } catch { toast.error('Action failed'); }
  };

  const roleColors = {
    student: '#eff6ff', coordinator: '#fdf4ff', hod: '#fefce8'
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">Add and manage students, coordinators, and HOD</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '➕ Add User'}
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Create New User</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-control" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-control" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-control" value={form.role_name}
                  onChange={e => setForm(p => ({ ...p, role_name: e.target.value }))}>
                  <option value="student">Student</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="hod">HOD</option>
                </select>
              </div>
              {form.role_name === 'student' && (
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input className="form-control" value={form.roll_number}
                    onChange={e => setForm(p => ({ ...p, roll_number: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Section ID</label>
                <input type="number" className="form-control" value={form.section_id}
                  onChange={e => setForm(p => ({ ...p, section_id: e.target.value }))}
                  placeholder="e.g. 1" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              {form.role_name === 'hod' && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.75rem' }}>
                  <input type="checkbox" id="is_assistant" checked={form.is_assistant}
                    onChange={e => setForm(p => ({ ...p, is_assistant: e.target.checked }))} />
                  <label htmlFor="is_assistant" style={{ fontSize: '0.9rem' }}>Is Assistant HOD</label>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">Create User</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {loading ? <div className="empty-state"><p>Loading...</p></div>
      : <div className="table-wrapper card">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Section</th><th>Roll No.</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ fontSize: '0.8rem' }}>{u.email}</td>
                  <td>
                    <span style={{
                      background: roleColors[u.role_name] || '#f8fafc',
                      padding: '0.15rem 0.6rem',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {u.role_name}{u.is_assistant ? ' (Asst.)' : ''}
                    </span>
                  </td>
                  <td>{u.section_name || '—'}</td>
                  <td>{u.roll_number || '—'}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                      onClick={() => handleToggle(u.user_id, u.name, u.is_active)}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
};

// ── All Permissions ───────────────────────────────────────────
const AllPermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [overrideId, setOverrideId]   = useState(null);
  const [overrideForm, setOverrideForm] = useState({ new_status: 'approved', remarks: '' });

  const fetchPermissions = () => {
    setLoading(true);
    api.get('/branch-admin/permissions')
      .then(r => { if (r.data.success) setPermissions(r.data.permissions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchPermissions, []);

  const handleOverride = async () => {
    if (!overrideForm.remarks.trim()) { toast.error('Remarks required for override'); return; }
    try {
      const res = await api.post(`/branch-admin/override/${overrideId}`, overrideForm);
      if (res.data.success) {
        toast.success('Override applied');
        setOverrideId(null);
        fetchPermissions();
      } else toast.error(res.data.message);
    } catch { toast.error('Override failed'); }
  };

  const badge = (s) => {
    const m = { approved: 'badge-approved', rejected: 'badge-rejected',
                pending: 'badge-pending', returned: 'badge-returned' };
    return <span className={`badge ${m[s] || ''}`}>{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All Permissions</h1>
        <p className="page-subtitle">Branch-wide permission requests. You can override any decision.</p>
      </div>

      {loading ? <div className="empty-state"><p>Loading...</p></div>
      : <div className="table-wrapper card">
          <table>
            <thead>
              <tr><th>Student</th><th>Section</th><th>Subject</th><th>Dates</th><th>Status</th><th>With</th><th>Override</th></tr>
            </thead>
            <tbody>
              {permissions.map(p => (
                <>
                  <tr key={p.request_id}>
                    <td><strong>{p.student_name}</strong><br/><small>{p.roll_number}</small></td>
                    <td>{p.section_name}</td>
                    <td style={{ maxWidth: 180 }}>{p.subject}</td>
                    <td style={{ fontSize: '0.78rem' }}>
                      {new Date(p.from_date).toLocaleDateString('en-IN')} →
                      {new Date(p.to_date).toLocaleDateString('en-IN')}
                    </td>
                    <td>{badge(p.status)}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {p.current_holder_role === 'completed' ? '✅' : p.current_holder_role}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                        onClick={() => setOverrideId(prev => prev === p.request_id ? null : p.request_id)}
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                  {overrideId === p.request_id && (
                    <tr key={`override-${p.request_id}`}>
                      <td colSpan={7} style={{ background: '#fffbeb', padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <div>
                            <label className="form-label">Override To</label>
                            <select className="form-control" style={{ minWidth: 130 }}
                              value={overrideForm.new_status}
                              onChange={e => setOverrideForm(p => ({ ...p, new_status: e.target.value }))}>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="form-label">Reason *</label>
                            <input className="form-control" placeholder="Reason for override"
                              value={overrideForm.remarks}
                              onChange={e => setOverrideForm(p => ({ ...p, remarks: e.target.value }))} />
                          </div>
                          <button className="btn btn-warning" onClick={handleOverride}>Apply Override</button>
                          <button className="btn btn-ghost" onClick={() => setOverrideId(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
};

const BranchAdminDashboard = () => (
  <div className="page-layout">
    <Sidebar />
    <main className="main-content">
      <Routes>
        <Route path="dashboard"   element={<DashboardHome />} />
        <Route path="users"       element={<ManageUsers />} />
        <Route path="permissions" element={<AllPermissions />} />
        <Route path="*"           element={<DashboardHome />} />
      </Routes>
    </main>
  </div>
);

export default BranchAdminDashboard;

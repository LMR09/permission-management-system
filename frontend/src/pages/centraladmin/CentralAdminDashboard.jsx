// src/pages/centraladmin/CentralAdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Dashboard Home ────────────────────────────────────────────
const DashboardHome = () => {
  const [stats, setStats] = useState({ branches: 0, principals: 0, total_users: 0, total_requests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/central-admin/dashboard-stats')
      .then(r => { if (r.data.success) setStats(r.data.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Central Admin Dashboard</h1>
        <p className="page-subtitle">Institution-wide control and governance</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Active Branches</div>
          <div className="stat-value">{loading ? '—' : stats.branches}</div></div>
        <div className="stat-card"><div className="stat-label">Active Principals</div>
          <div className="stat-value">{loading ? '—' : stats.principals}</div></div>
        <div className="stat-card"><div className="stat-label">Total Users</div>
          <div className="stat-value">{loading ? '—' : stats.total_users}</div></div>
        <div className="stat-card"><div className="stat-label">Total Requests</div>
          <div className="stat-value">{loading ? '—' : stats.total_requests}</div></div>
      </div>
    </div>
  );
};

// ── Manage Principals ─────────────────────────────────────────
const ManagePrincipals = () => {
  const [principals, setPrincipals] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  const fetchPrincipals = () => {
    setLoading(true);
    api.get('/central-admin/principals')
      .then(r => { if (r.data.success) setPrincipals(r.data.principals); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchPrincipals, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/central-admin/principals', form);
      if (res.data.success) {
        toast.success('Principal added');
        setShowForm(false);
        setForm({ name: '', email: '', password: '', phone: '' });
        fetchPrincipals();
      } else toast.error(res.data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleToggle = async (id, name, isActive) => {
    if (!window.confirm(`${isActive ? 'Disable' : 'Enable'} principal "${name}"?`)) return;
    try {
      const res = await api.patch(`/central-admin/principals/${id}/toggle`);
      if (res.data.success) { toast.success(res.data.message); fetchPrincipals(); }
      else toast.error(res.data.message);
    } catch { toast.error('Action failed'); }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Manage Principals</h1>
          <p className="page-subtitle">Add, enable, or disable college principals</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '➕ Add Principal'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Add New Principal</h3>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label className="form-label">Full Name *</label>
                <input className="form-control" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Email *</label>
                <input type="email" className="form-control" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Password *</label>
                <input type="password" className="form-control" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required /></div>
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-control" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">Add Principal</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="empty-state"><p>Loading...</p></div>
      : <div className="table-wrapper card">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Added</th><th>Action</th></tr></thead>
            <tbody>
              {principals.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No principals added yet</td></tr>
                : principals.map(p => (
                    <tr key={p.user_id}>
                      <td><strong>{p.name}</strong></td>
                      <td style={{ fontSize: '0.8rem' }}>{p.email}</td>
                      <td>{p.phone || '—'}</td>
                      <td>
                        <span className={`badge ${p.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                          {p.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <button
                          className={`btn ${p.is_active ? 'btn-danger' : 'btn-success'}`}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                          onClick={() => handleToggle(p.user_id, p.name, p.is_active)}
                        >
                          {p.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  );
};

// ── Branches ──────────────────────────────────────────────────
const Branches = () => {
  const [branches, setBranches]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showAdminForm, setShowAdminForm]   = useState(null); // stores branch_id
  const [branchForm, setBranchForm]         = useState({ branch_name: '', branch_code: '' });
  const [adminForm, setAdminForm]           = useState({ name: '', email: '', password: '', phone: '' });

  const fetchBranches = () => {
    setLoading(true);
    api.get('/central-admin/branches')
      .then(r => { if (r.data.success) setBranches(r.data.branches); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchBranches, []);

  const handleAddBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/central-admin/branches', branchForm);
      if (res.data.success) {
        toast.success('Branch added successfully');
        setShowBranchForm(false);
        setBranchForm({ branch_name: '', branch_code: '' });
        fetchBranches();
      } else toast.error(res.data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAddBranchAdmin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/central-admin/branch-admins', {
        ...adminForm,
        branch_id: showAdminForm
      });
      if (res.data.success) {
        toast.success('Branch Admin created! They can now login with their email & password.');
        setShowAdminForm(null);
        setAdminForm({ name: '', email: '', password: '', phone: '' });
      } else toast.error(res.data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Add branches, then assign a Branch Admin with login credentials</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowBranchForm(s => !s)}>
          {showBranchForm ? '✕ Cancel' : '➕ Add Branch'}
        </button>
      </div>

      {/* Add Branch Form */}
      {showBranchForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>New Branch</h3>
          <form onSubmit={handleAddBranch}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Branch Name *</label>
                <input className="form-control" placeholder="e.g. Computer Science Engineering - AI"
                  value={branchForm.branch_name}
                  onChange={e => setBranchForm(p => ({ ...p, branch_name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Branch Code *</label>
                <input className="form-control" placeholder="e.g. CSE-AI"
                  value={branchForm.branch_code}
                  onChange={e => setBranchForm(p => ({ ...p, branch_code: e.target.value }))} required />
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">Add Branch</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowBranchForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Add Branch Admin Form — appears when Assign Admin is clicked */}
      {showAdminForm && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid var(--primary)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Create Branch Admin
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            This person will manage users in the branch and can login with the credentials below.
          </p>
          <form onSubmit={handleAddBranchAdmin}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" placeholder="e.g. Dr. Ramesh Kumar"
                  value={adminForm.name}
                  onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email (used to login) *</label>
                <input type="email" className="form-control" placeholder="e.g. admin.cseai@college.edu"
                  value={adminForm.email}
                  onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-control" placeholder="Min 6 characters"
                  value={adminForm.password}
                  onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input className="form-control" placeholder="e.g. 9876543210"
                  value={adminForm.phone}
                  onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">Create Branch Admin</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdminForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Branches Table */}
      {loading ? <div className="empty-state"><p>Loading...</p></div>
      : <div className="table-wrapper card">
          <table>
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Code</th>
                <th>Sections</th>
                <th>Users</th>
                <th>Status</th>
                <th>Branch Admin</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.branch_id}>
                  <td><strong>{b.branch_name}</strong></td>
                  <td><span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{b.branch_code}</span></td>
                  <td>{b.section_count}</td>
                  <td>{b.user_count}</td>
                  <td>
                    <span className={`badge ${b.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                      onClick={() => setShowAdminForm(prev => prev === b.branch_id ? null : b.branch_id)}
                    >
                      {showAdminForm === b.branch_id ? '✕ Cancel' : '👤 Assign Admin'}
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

// ── System Logs ───────────────────────────────────────────────
const SystemLogs = () => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/central-admin/logs')
      .then(r => { if (r.data.success) setLogs(r.data.logs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Logs</h1>
        <p className="page-subtitle">All admin actions and structural changes</p>
      </div>

      {loading ? <div className="empty-state"><p>Loading...</p></div>
      : <div className="table-wrapper card">
          <table>
            <thead><tr><th>Admin</th><th>Role</th><th>Action</th><th>Target</th><th>Remarks</th><th>Time</th></tr></thead>
            <tbody>
              {logs.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No logs yet</td></tr>
                : logs.map(l => (
                    <tr key={l.action_id}>
                      <td><strong>{l.admin_name}</strong></td>
                      <td style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>{l.admin_role.replace('_', ' ')}</td>
                      <td><span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'capitalize' }}>
                        {l.action_type.replace('_', ' ')}</span></td>
                      <td style={{ fontSize: '0.8rem' }}>{l.target_name || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 200 }}>{l.remarks || '—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(l.action_time).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  );
};

const CentralAdminDashboard = () => (
  <div className="page-layout">
    <Sidebar />
    <main className="main-content">
      <Routes>
        <Route path="dashboard"  element={<DashboardHome />} />
        <Route path="principals" element={<ManagePrincipals />} />
        <Route path="branches"   element={<Branches />} />
        <Route path="logs"       element={<SystemLogs />} />
        <Route path="*"          element={<DashboardHome />} />
      </Routes>
    </main>
  </div>
);

export default CentralAdminDashboard;
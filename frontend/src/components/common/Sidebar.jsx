// src/components/common/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Sidebar.css';

const roleMenus = {
  student: [
    { path: '/student/dashboard',          label: 'Dashboard',         icon: '🏠' },
    { path: '/student/new-permission',     label: 'New Permission',    icon: '➕' },
    { path: '/student/my-permissions',     label: 'My Permissions',    icon: '📋' },
  ],
  coordinator: [
    { path: '/coordinator/dashboard',      label: 'Dashboard',         icon: '🏠' },
    { path: '/coordinator/pending',        label: 'Pending Requests',  icon: '⏳' },
    { path: '/coordinator/history',        label: 'History',           icon: '📂' },
  ],
  hod: [
    { path: '/hod/dashboard',             label: 'Dashboard',         icon: '🏠' },
    { path: '/hod/pending',               label: 'Pending Requests',  icon: '⏳' },
    { path: '/hod/history',              label: 'History',           icon: '📂' },
  ],
  principal: [
    { path: '/principal/dashboard',       label: 'Dashboard',         icon: '🏠' },
    { path: '/principal/pending',         label: 'Pending Approvals', icon: '⏳' },
    { path: '/principal/history',         label: 'History',           icon: '📂' },
  ],
  branch_admin: [
    { path: '/branch-admin/dashboard',    label: 'Dashboard',         icon: '🏠' },
    { path: '/branch-admin/users',        label: 'Manage Users',      icon: '👥' },
    { path: '/branch-admin/permissions',  label: 'All Permissions',   icon: '📋' },
    { path: '/branch-admin/structure',    label: 'Branch Structure',  icon: '🏫' },
  ],
  central_admin: [
    { path: '/central-admin/dashboard',   label: 'Dashboard',         icon: '🏠' },
    { path: '/central-admin/principals',  label: 'Manage Principals', icon: '🎓' },
    { path: '/central-admin/branches',    label: 'Branches',          icon: '🏫' },
    { path: '/central-admin/logs',        label: 'System Logs',       icon: '🔍' },
  ]
};

const roleLabels = {
  student:       'Student',
  coordinator:   'Coordinator',
  hod:           'HOD',
  principal:     'Principal',
  branch_admin:  'Branch Admin',
  central_admin: 'Central Admin'
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const menu = roleMenus[user?.role_name] || [];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🎓</span>
        <div>
          <div className="sidebar-logo-title">PMS</div>
          <div className="sidebar-logo-sub">Vignan College</div>
        </div>
      </div>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">
            {roleLabels[user?.role_name]}
            {user?.is_assistant ? ' (Asst.)' : ''}
          </div>
          {user?.section_name && (
            <div className="sidebar-user-section">
              {user.branch_code} – Sec {user.section_name}
            </div>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Change Password + Logout */}
      <div className="sidebar-bottom">
        <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <span className="sidebar-link-icon">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

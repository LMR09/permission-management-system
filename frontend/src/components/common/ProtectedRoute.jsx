// src/components/common/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1rem',
        color: '#64748b'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role_name)) {
    // Redirect to their correct dashboard
    const paths = {
      student:       '/student/dashboard',
      coordinator:   '/coordinator/dashboard',
      hod:           '/hod/dashboard',
      principal:     '/principal/dashboard',
      branch_admin:  '/branch-admin/dashboard',
      central_admin: '/central-admin/dashboard'
    };
    return <Navigate to={paths[user.role_name] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;

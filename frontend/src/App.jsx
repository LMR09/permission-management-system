// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Dashboards (we will build these one by one)
import StudentDashboard from './pages/student/StudentDashboard';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import HODDashboard from './pages/hod/HODDashboard';
import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import BranchAdminDashboard from './pages/branchadmin/BranchAdminDashboard';
import CentralAdminDashboard from './pages/centraladmin/CentralAdminDashboard';

// Global styles
import './styles/global.css';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '10px',
              fontSize: '0.9rem'
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Student Routes */}
          <Route path="/student/*" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />

          {/* Coordinator Routes */}
          <Route path="/coordinator/*" element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          } />

          {/* HOD Routes */}
          <Route path="/hod/*" element={
            <ProtectedRoute allowedRoles={['hod']}>
              <HODDashboard />
            </ProtectedRoute>
          } />

          {/* Principal Routes */}
          <Route path="/principal/*" element={
            <ProtectedRoute allowedRoles={['principal']}>
              <PrincipalDashboard />
            </ProtectedRoute>
          } />

          {/* Branch Admin Routes */}
          <Route path="/branch-admin/*" element={
            <ProtectedRoute allowedRoles={['branch_admin']}>
              <BranchAdminDashboard />
            </ProtectedRoute>
          } />

          {/* Central Admin Routes */}
          <Route path="/central-admin/*" element={
            <ProtectedRoute allowedRoles={['central_admin']}>
              <CentralAdminDashboard />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

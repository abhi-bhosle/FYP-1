import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import ProjectDetails from './pages/ProjectDetails';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Reports from './pages/Reports';
import Evaluations from './pages/Evaluations';
import Profile from './pages/Profile';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import WeeklyReports from './pages/WeeklyReports';
import AuditLogs from './pages/AuditLogs';

// Layout
import Layout from './components/Layout';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

// 404 Redirect Component
const NotFoundRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={user ? "/app/dashboard" : "/"} replace />;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Home Page - Public */}
        <Route path="/" element={<Home />} />
        
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="analytics" element={
            <ProtectedRoute roles={['guide', 'coordinator', 'admin']}>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/create" element={
            <ProtectedRoute roles={['student']}>
              <CreateProject />
            </ProtectedRoute>
          } />
          <Route path="projects/:id" element={<ProjectDetails />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<GroupDetails />} />
          <Route path="reports" element={<Reports />} />
          <Route path="weekly-reports" element={<WeeklyReports />} />
          <Route path="evaluations" element={<Evaluations />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['admin', 'coordinator']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit-logs"
            element={
              <ProtectedRoute roles={['admin', 'coordinator']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 - Redirect based on auth status */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherClassDetail from './pages/teacher/TeacherClassDetail';
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentClassDetail from './pages/student/StudentClassDetail';
import BrowseClasses from './pages/student/BrowseClasses';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<AuthPage initialMode="login" />} />
      <Route path="/register" element={<AuthPage initialMode="register" />} />

      {/* Teacher Protected Routes */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Layout>
              <TeacherDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Layout>
              <TeacherClasses />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/classes/:id"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Layout>
              <TeacherClassDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/announcements"
        element={
          <ProtectedRoute allowedRole="teacher">
            <Layout>
              <TeacherAnnouncements />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Student Protected Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute allowedRole="student">
            <Layout>
              <StudentDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/classes"
        element={
          <ProtectedRoute allowedRole="student">
            <Layout>
              <StudentClasses />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/classes/:id"
        element={
          <ProtectedRoute allowedRole="student">
            <Layout>
              <StudentClassDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/browse"
        element={
          <ProtectedRoute allowedRole="student">
            <Layout>
              <BrowseClasses />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback & Root */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

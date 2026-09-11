import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import LandingLayout   from './layouts/LandingLayout';

// Public Pages
import Home    from './pages/public/Home';
import About   from './pages/public/About';
import Contact from './pages/public/Contact';

// Unified Customized Auth Page
import AuthPage from './pages/auth/AuthPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import Courses          from './pages/teacher/Courses';
import Attendance       from './pages/teacher/Attendance';
import Performance      from './pages/teacher/Performance';
import Quiz             from './pages/teacher/Quiz';
import Test             from './pages/teacher/Test';
import Others           from './pages/teacher/Others';
import FinalResult      from './pages/teacher/FinalResult';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentMarksPage from './pages/student/StudentMarksPage';

// Protected Route guard
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <span className="loading loading-spinner text-primary loading-lg"></span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'admin')   return <Navigate to="/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }
  return children;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ToastContainer position="top-right" autoClose={3000} theme="colored" />
          <Routes>
            {/* ── Public / Landing ──────────────────────────────── */}
            <Route element={<LandingLayout />}>
              <Route path="/"        element={<Home    />} />
              <Route path="/about"   element={<About   />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            {/* ── Unified & Customized Auth Portal ──────────────── */}
            <Route path="/login"          element={<AuthPage />} />
            <Route path="/signup"         element={<AuthPage />} />
            <Route path="/auth"           element={<AuthPage />} />
            <Route path="/login/student"  element={<AuthPage />} />
            <Route path="/signup/student" element={<AuthPage />} />
            <Route path="/login/teacher"  element={<AuthPage />} />
            <Route path="/signup/teacher" element={<AuthPage />} />
            <Route path="/login/admin"    element={<AuthPage />} />

            {/* ── Admin Routes ──────────────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRole="admin">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
            </Route>

            {/* ── Teacher Routes ────────────────────────────────── */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRole="teacher">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index             element={<TeacherDashboard />} />
              <Route path="courses"    element={<Courses          />} />
              <Route path="attendance" element={<Attendance       />} />
              <Route path="performance"element={<Performance      />} />
              <Route path="quiz"       element={<Quiz             />} />
              <Route path="test"       element={<Test             />} />
              <Route path="others"     element={<Others           />} />
              <Route path="results"    element={<FinalResult      />} />
            </Route>

            {/* ── Student Routes ────────────────────────────────── */}
            <Route path="/student" element={
              <ProtectedRoute allowedRole="student">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StudentDashboard />} />
              <Route path="marks/:courseCode" element={<StudentMarksPage />} />
            </Route>

            {/* ── Catch-all ─────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

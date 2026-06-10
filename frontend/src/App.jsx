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

// Auth Pages (Unified with Slider)
import TeacherAuth  from './pages/auth/TeacherAuth';
import StudentAuth  from './pages/auth/StudentAuth';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import Courses          from './pages/teacher/Courses';
import Attendance       from './pages/teacher/Attendance';
import Performance      from './pages/teacher/Performance';
import Quiz             from './pages/teacher/Quiz';
import Test             from './pages/teacher/Test';
import Viva             from './pages/teacher/Viva';
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
  if (!user) return <Navigate to="/login/teacher" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
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

            {/* ── Auth Pages ────────────────────────────────────── */}
            <Route path="/login/teacher"  element={<TeacherAuth />} />
            <Route path="/signup/teacher" element={<TeacherAuth />} />
            <Route path="/login/student"  element={<StudentAuth />} />
            <Route path="/signup/student" element={<StudentAuth />} />
            {/* Legacy /login redirect */}
            <Route path="/login" element={<Navigate to="/login/teacher" replace />} />

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
              <Route path="viva"       element={<Viva             />} />
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

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastContainer } from 'react-toastify';
import ErrorBoundary from './components/ErrorBoundary';
import 'react-toastify/dist/ReactToastify.css';
import ScrollToTop from './components/ScrollToTop';

// Layouts (loaded eagerly — small, always needed)
import DashboardLayout from './layouts/DashboardLayout';
import LandingLayout   from './layouts/LandingLayout';

// ── Lazy-Loaded Pages ─────────────────────────────────────────────────
// Public Pages
const Home    = React.lazy(() => import('./pages/public/Home'));
const About   = React.lazy(() => import('./pages/public/About'));
const Contact = React.lazy(() => import('./pages/public/Contact'));

// Auth
const AuthPage        = React.lazy(() => import('./pages/auth/AuthPage'));
const AdminLoginPage  = React.lazy(() => import('./pages/auth/AdminLoginPage'));

// Admin Pages
const AdminDashboard        = React.lazy(() => import('./pages/admin/AdminDashboard'));
const FacultiesPage         = React.lazy(() => import('./pages/admin/FacultiesPage'));
const DepartmentsPage       = React.lazy(() => import('./pages/admin/DepartmentsPage'));
const SeriesPage            = React.lazy(() => import('./pages/admin/SeriesPage'));
const AcademicSessionsPage  = React.lazy(() => import('./pages/admin/AcademicSessionsPage'));
const TeachersPage          = React.lazy(() => import('./pages/admin/TeachersPage'));
const StudentsPage          = React.lazy(() => import('./pages/admin/StudentsPage'));
const CourseCatalogPage     = React.lazy(() => import('./pages/admin/CourseCatalogPage'));
const CourseOfferingsPage   = React.lazy(() => import('./pages/admin/CourseOfferingsPage'));
const StudentImportPage     = React.lazy(() => import('./pages/admin/StudentImportPage'));
const ImportHistoryPage     = React.lazy(() => import('./pages/admin/ImportHistoryPage'));
const ElectiveManagementPage = React.lazy(() => import('./pages/admin/ElectiveManagementPage'));
const TeachingAssignmentsPage = React.lazy(() => import('./pages/admin/TeachingAssignmentsPage'));
const DepartmentHeadManagementPage = React.lazy(() => import('./pages/admin/DepartmentHeadManagementPage'));

// Department Head Pages
const HeadDashboard            = React.lazy(() => import('./pages/head/HeadDashboard'));
const HeadAcademicSessionsPage = React.lazy(() => import('./pages/head/HeadAcademicSessionsPage'));
const HeadSessionDetailPage    = React.lazy(() => import('./pages/head/HeadSessionDetailPage'));
const HeadStudentsPage         = React.lazy(() => import('./pages/head/HeadStudentsPage'));
const HeadStudentDetailPage    = React.lazy(() => import('./pages/head/HeadStudentDetailPage'));
const HeadTeachersPage         = React.lazy(() => import('./pages/head/HeadTeachersPage'));
const HeadCoursesPage          = React.lazy(() => import('./pages/head/HeadCoursesPage'));
const HeadAnalyticsPage        = React.lazy(() => import('./pages/head/HeadAnalyticsPage'));
const HeadTeachingAssignmentsPage = React.lazy(() => import('./pages/head/HeadTeachingAssignmentsPage'));
const HeadSupervisionPage      = React.lazy(() => import('./pages/head/HeadSupervisionPage'));
const HeadshipTransferPage     = React.lazy(() => import('./pages/head/HeadshipTransferPage'));

// Teacher Pages
const TeacherDashboard  = React.lazy(() => import('./pages/teacher/TeacherDashboard'));
const Courses           = React.lazy(() => import('./pages/teacher/Courses'));
const Attendance        = React.lazy(() => import('./pages/teacher/Attendance'));
const Performance       = React.lazy(() => import('./pages/teacher/Performance'));
const Quiz              = React.lazy(() => import('./pages/teacher/Quiz'));
const Test              = React.lazy(() => import('./pages/teacher/Test'));
const Others            = React.lazy(() => import('./pages/teacher/Others'));
const FinalResult       = React.lazy(() => import('./pages/teacher/FinalResult'));
const TeacherLeavePage  = React.lazy(() => import('./pages/teacher/TeacherLeavePage'));
const TeacherElectivesPage = React.lazy(() => import('./pages/teacher/TeacherElectivesPage'));

// Student Pages
const StudentDashboard         = React.lazy(() => import('./pages/student/StudentDashboard'));
const StudentMarksPage         = React.lazy(() => import('./pages/student/StudentMarksPage'));
const StudentElectiveSelection = React.lazy(() => import('./pages/student/StudentElectiveSelection'));
const StudentAcademicHistory   = React.lazy(() => import('./pages/student/StudentAcademicHistory'));
const StudentProfile           = React.lazy(() => import('./pages/student/StudentProfile'));
const ProjectTeamWorkspace     = React.lazy(() => import('./pages/student/ProjectTeamWorkspace'));

// ── Loading Fallback ──────────────────────────────────────────────────
const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-slate-300 dark:border-slate-600 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading...</span>
    </div>
  </div>
);

// ── Protected Route Guard ─────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRole === 'admin') {
    if (user.role === 'admin' || user.role === 'super_admin') return children;
    if (user.role === 'department_head') return <Navigate to="/head" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  if (allowedRole === 'department_head') {
    if (user.role === 'department_head') return children;
    if (user.role === 'admin' || user.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  if (allowedRole === 'teacher') {
    if (user.role === 'teacher') return children;
    if (user.role === 'admin' || user.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (user.role === 'department_head') return <Navigate to="/head" replace />;
    return <Navigate to="/student" replace />;
  }

  if (allowedRole === 'student') {
    if (user.role === 'student') return children;
    if (user.role === 'admin' || user.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (user.role === 'department_head') return <Navigate to="/head" replace />;
    return <Navigate to="/teacher" replace />;
  }

  return children;
};

// ── Hidden Admin Route Component ───────────────────────────────────────
// If unauthenticated: displays dedicated Admin Login page
// If authenticated as Admin: renders Admin Dashboard
// If authenticated as Department Head: redirects to /head
const AdminPortalGuard = () => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <PageLoader />;
  if (!user) return <AdminLoginPage />;
  if (user.role === 'department_head') return <Navigate to="/head" replace />;
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return <AdminLoginPage />;
  }
  return <DashboardLayout />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <ToastContainer position="top-right" autoClose={3000} theme="colored" />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public / Landing ──────────────────────────────── */}
            <Route element={<LandingLayout />}>
              <Route path="/"        element={<Home    />} />
              <Route path="/about"   element={<About   />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            {/* ── Public Auth Portal (Student, Teacher, Head) ───── */}
            <Route path="/login"          element={<AuthPage />} />
            <Route path="/auth"           element={<AuthPage />} />
            <Route path="/login/student"  element={<AuthPage />} />
            <Route path="/login/teacher"  element={<AuthPage />} />
            <Route path="/login/head"     element={<AuthPage />} />

            <Route path="/signup"         element={<AuthPage />} />
            <Route path="/signup/student" element={<AuthPage />} />
            <Route path="/signup/teacher" element={<AuthPage />} />
            <Route path="/signup/head"    element={<AuthPage />} />

            {/* ── Hidden Admin Portal (System Administrators only) ─ */}
            <Route path="/admin" element={<AdminPortalGuard />}>
              <Route index                  element={<AdminDashboard />} />
              <Route path="faculties"       element={<FacultiesPage />} />
              <Route path="departments"     element={<DepartmentsPage />} />
              <Route path="sessions"        element={<AcademicSessionsPage />} />
              <Route path="series"          element={<SeriesPage />} />
              <Route path="teachers"        element={<TeachersPage />} />
              <Route path="teaching-assignments" element={<TeachingAssignmentsPage />} />
              <Route path="heads"           element={<DepartmentHeadManagementPage />} />
              <Route path="students"        element={<StudentsPage />} />
              <Route path="course-catalog"  element={<CourseCatalogPage />} />
              <Route path="course-offerings" element={<CourseOfferingsPage />} />
              <Route path="import"           element={<StudentImportPage />} />
              <Route path="import-history"   element={<ImportHistoryPage />} />
              <Route path="electives"        element={<ElectiveManagementPage />} />
            </Route>

            {/* ── Department Head Routes (Strictly Scoped) ──────── */}
            <Route path="/head" element={
              <ProtectedRoute allowedRole="department_head">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index                               element={<HeadDashboard />} />
              <Route path="dashboard"                    element={<HeadDashboard />} />
              <Route path="academic-sessions"            element={<HeadAcademicSessionsPage />} />
              <Route path="academic-sessions/:sessionId" element={<HeadSessionDetailPage />} />
              <Route path="students"                     element={<HeadStudentsPage />} />
              <Route path="students/:id"                 element={<HeadStudentDetailPage />} />
              <Route path="teachers"                     element={<HeadTeachersPage />} />
              <Route path="courses"                      element={<HeadCoursesPage />} />
              <Route path="teaching-assignments"         element={<HeadTeachingAssignmentsPage />} />
              <Route path="supervision"                  element={<HeadSupervisionPage />} />
              <Route path="headship-transfer"            element={<HeadshipTransferPage />} />
              <Route path="projects/:projectId/workspace" element={<ProjectTeamWorkspace />} />
              <Route path="electives"                    element={<ElectiveManagementPage />} />
              <Route path="attendance"                   element={<Attendance />} />
              <Route path="marks"                        element={<FinalResult />} />
              <Route path="analytics"                    element={<HeadAnalyticsPage />} />
            </Route>

            {/* ── Teacher Routes ────────────────────────────────── */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRole="teacher">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index                               element={<TeacherDashboard />} />
              <Route path="courses"                      element={<Courses          />} />
              <Route path="supervision"                  element={<TeacherDashboard />} />
              <Route path="projects/:projectId/workspace" element={<ProjectTeamWorkspace />} />
              <Route path="electives"                    element={<TeacherElectivesPage />} />
              <Route path="attendance"                   element={<Attendance       />} />
              <Route path="performance"                  element={<Performance      />} />
              <Route path="quiz"                         element={<Quiz             />} />
              <Route path="test"                         element={<Test             />} />
              <Route path="others"                       element={<Others           />} />
              <Route path="results"                      element={<FinalResult      />} />
              <Route path="leave"                        element={<TeacherLeavePage />} />
            </Route>

            {/* ── Student Routes ────────────────────────────────── */}
            <Route path="/student" element={
              <ProtectedRoute allowedRole="student">
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index                               element={<StudentDashboard />} />
              <Route path="supervision"                  element={<StudentDashboard />} />
              <Route path="projects/:projectId/workspace" element={<ProjectTeamWorkspace />} />
              <Route path="electives"                    element={<StudentElectiveSelection />} />
              <Route path="marks/:courseCode"            element={<StudentMarksPage />} />
              <Route path="history"                      element={<StudentAcademicHistory />} />
              <Route path="profile"                      element={<StudentProfile />} />
            </Route>

            {/* ── Catch-all ─────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Router>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

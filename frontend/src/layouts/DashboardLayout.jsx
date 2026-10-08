import { useState, useContext } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import RuetLogo from '../components/RuetLogo';
import PageTransition from '../components/PageTransition';
import {
  LayoutDashboard, BookOpen, Activity, HelpCircle, FileCheck,
  ClipboardList, TrendingUp, LogOut, Sun, Moon, Menu, X,
  Phone, Building2, ChevronRight, GraduationCap, Users,
  Calendar, CalendarOff, FolderTree, FileText, Bell, ChevronDown,
  Upload, History, Award, KeyRound, Sparkles, Layers, Shield, Database,
  ArrowRight
} from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';

/* ── Navigation Configuration ────────────────────────────── */

const adminNav = [
  { heading: 'Overview' },
  { to: '/admin', icon: LayoutDashboard, label: 'System Overview', end: true },
  { to: '/admin/data-management', icon: Database, label: 'Data Management Portal' },
  
  { heading: 'Teaching & Faculty' },
  { to: '/admin/teaching-assignments', icon: BookOpen,      label: 'Teaching Assignments' },
  { to: '/admin/teachers',             icon: GraduationCap, label: 'All Teachers' },
  { to: '/admin/heads',                icon: Shield,        label: 'Department Heads' },

  { heading: 'Student Management' },
  { to: '/admin/students',         icon: Users,           label: 'All Students' },
  { to: '/admin/import',           icon: Upload,          label: 'Import Students' },
  { to: '/admin/import-history',   icon: History,         label: 'Import History' },

  { heading: 'Academics & Courses' },
  { to: '/admin/course-catalog',   icon: BookOpen,        label: 'Course Catalog' },
  { to: '/admin/course-offerings', icon: Award,           label: 'Course Offerings' },
  { to: '/admin/electives',        icon: Sparkles,        label: 'Elective Management' },

  { heading: 'Institution' },
  { to: '/admin/faculties',        icon: FolderTree,      label: 'Faculties' },
  { to: '/admin/departments',      icon: Building2,       label: 'Departments' },
  { to: '/admin/sessions',         icon: Calendar,        label: 'Academic Sessions' },
  { to: '/admin/series',           icon: Layers,          label: 'Series / Batches' },
];

const headNav = [
  { heading: 'Overview' },
  { to: '/head', icon: LayoutDashboard, label: 'Department Overview', end: true },

  { heading: 'Academic Sessions & Students' },
  { to: '/head/academic-sessions', icon: Calendar, label: 'Academic Sessions' },
  { to: '/head/students',          icon: Users,    label: 'Department Students' },

  { heading: 'Faculty & Allocation' },
  { to: '/head/teachers',             icon: GraduationCap, label: 'Department Teachers' },
  { to: '/head/teaching-assignments', icon: BookOpen,      label: 'Teaching Assignments' },
  { to: '/head/supervision',          icon: Layers,        label: 'Projects & Supervision' },

  { heading: 'Courses & Electives' },
  { to: '/head/courses',   icon: BookOpen, label: 'Course Catalog' },
  { to: '/head/electives', icon: Sparkles, label: 'Elective Management' },

  { heading: 'Governance' },
  { to: '/head/headship-transfer', icon: Shield, label: 'Headship Transfer' },

  { heading: 'Evaluation & Analytics' },
  { to: '/head/attendance', icon: ClipboardList, label: 'Attendance & Reports' },
  { to: '/head/marks',      icon: TrendingUp,    label: 'Marks & Grades' },
  { to: '/head/analytics',  icon: Activity,      label: 'Academic Analytics' },
];

const teacherNav = [
  { heading: 'Main' },
  { to: '/teacher',            icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/teacher/courses',   icon: BookOpen,        label: 'My Courses' },
  { to: '/teacher/electives', icon: Sparkles,        label: 'Elective Rosters' },
  { heading: 'Supervision' },
  { to: '/teacher/supervision', icon: Layers,        label: 'Project Students' },
  { heading: 'Mark Entry' },
  { to: '/teacher/attendance', icon: ClipboardList,  label: 'Attendance & Report' },
  { to: '/teacher/performance',icon: Activity,       label: 'Lab Performance' },
  { to: '/teacher/quiz',      icon: HelpCircle,      label: 'Lab Quiz' },
  { to: '/teacher/test',      icon: FileCheck,       label: 'Lab Test' },
  { to: '/teacher/others',    icon: ClipboardList,   label: 'Others' },
  { to: '/teacher/results',   icon: TrendingUp,      label: 'Final Result' },
  { heading: 'Personal' },
  { to: '/teacher/leave',     icon: CalendarOff,     label: 'Leave Requests' },
];

const studentNav = [
  { heading: 'Academic' },
  { to: '/student', icon: LayoutDashboard, label: 'My Courses', end: true },
  { to: '/student/electives', icon: Sparkles, label: 'Elective Selection' },
  { to: '/student/history', icon: FileText, label: 'Academic History' },
  { heading: 'Account' },
  { to: '/student/profile', icon: Users, label: 'My Profile' },
];

/* ── Minimalist Premium Sidebar (Section 7) ───────────────── */
function Sidebar({ user, navItems, handleLogout, onOpenChangePassword, onClose }) {
  const [profileOpen, setProfileOpen] = useState(false);

  const getRoleBadge = () => {
    if (user?.role === 'admin' || user?.role === 'super_admin') return 'System Administrator';
    if (user?.role === 'department_head') return 'Department Head';
    if (user?.role === 'teacher') return 'Faculty Member';
    return 'Student';
  };

  const getPortalBase = () => {
    if (user?.role === 'admin' || user?.role === 'super_admin') return '/admin';
    if (user?.role === 'department_head') return '/head';
    if (user?.role === 'teacher') return '/teacher';
    return '/student';
  };

  const getIdentifier = () => {
    if (user?.role === 'admin' || user?.role === 'super_admin') return user?.name || user?.username || 'Admin';
    if (user?.role === 'department_head') return user?.name || user?.headId || 'Head';
    if (user?.role === 'teacher') return user?.teacherId || user?.name || 'Teacher';
    return user?.rollNumber || 'Student';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-surface border-r border-border dark:border-border select-none">
      {/* ── Brand Header ── */}
      <Link
        to={getPortalBase()}
        onClick={onClose}
        className="flex items-center gap-3 px-5 py-4 border-b border-border dark:border-border hover:bg-surface-secondary dark:hover:bg-surface-secondary transition-colors"
      >
        <RuetLogo size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-heading text-base font-extrabold text-text-primary dark:text-text-primary tracking-tight">
              Lab<span className="text-primary dark:text-primary">Eval</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary-soft dark:bg-primary-soft text-primary dark:text-primary border border-blue-200/50 dark:border-blue-900/50 uppercase">
              RUET
            </span>
          </div>
          <p className="text-[10px] font-medium text-text-muted dark:text-text-muted truncate mt-0.5">
            Performance Management
          </p>
        </div>
      </Link>

      {/* ── User Profile Card ── */}
      <div className="p-3 border-b border-border dark:border-border">
        <button
          onClick={() => setProfileOpen(p => !p)}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-surface-secondary dark:bg-surface-secondary border border-border dark:border-border hover:border-border-strong dark:hover:border-border-strong transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-text-primary dark:text-text-primary truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] font-medium text-text-muted dark:text-text-muted truncate">
              {getRoleBadge()}
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`text-text-muted dark:text-text-muted transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {profileOpen && (
          <div className="mt-2 p-3 rounded-xl bg-surface-secondary dark:bg-surface-secondary border border-border dark:border-border text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-text-muted dark:text-text-muted">
              <GraduationCap size={13} />
              <span className="font-mono text-[11px] text-text-primary dark:text-text-primary font-semibold">{getIdentifier()}</span>
            </div>
            {user?.department && (
              <div className="flex items-center gap-2 text-text-muted dark:text-text-muted">
                <Building2 size={13} />
                <span className="text-[11px]">Dept. of {user.department}</span>
              </div>
            )}
            {user?.contactNo && (
              <div className="flex items-center gap-2 text-text-muted dark:text-text-muted">
                <Phone size={13} />
                <span className="text-[11px]">{user.contactNo}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation Items (Section 7) ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {navItems.map((item, idx) => {
          if (item.heading) {
            return (
              <p
                key={`h-${idx}`}
                className="text-[10px] font-bold uppercase tracking-wider text-text-muted dark:text-text-muted px-3 pt-4 pb-1.5 first:pt-1"
              >
                {item.heading}
              </p>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary-soft dark:bg-primary-soft text-primary dark:text-primary shadow-xs'
                    : 'text-text-secondary dark:text-text-secondary hover:bg-surface-secondary dark:hover:bg-surface-secondary hover:text-text-primary dark:hover:text-text-primary'
                }`
              }
            >
              <Icon size={15} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Bottom Controls ── */}
      <div className="p-3 border-t border-border dark:border-border space-y-1">
        <button
          onClick={() => { onOpenChangePassword && onOpenChangePassword(); onClose && onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary dark:text-text-secondary hover:bg-surface-secondary dark:hover:bg-surface-secondary hover:text-text-primary dark:hover:text-text-primary transition-colors"
        >
          <KeyRound size={14} />
          <span>Security / Password</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main Dashboard Layout (Section 6, 8) ─────────────────── */
export default function DashboardLayout() {
  const { user, logout, headMode, toggleHeadMode } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  let navItems = studentNav;
  if (user?.role === 'teacher') navItems = teacherNav;
  if (user?.role === 'department_head') {
    navItems = headMode === 'TEACHER' ? teacherNav : headNav;
  }
  if (user?.role === 'admin' || user?.role === 'super_admin') navItems = adminNav;

  const handleLogout = () => { logout(); navigate('/'); };

  const handleSwitchMode = (targetMode) => {
    if (headMode === targetMode) return;
    toggleHeadMode(targetMode);
    if (targetMode === 'HEAD') {
      navigate('/head');
    } else {
      navigate('/teacher');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-background text-text-primary dark:text-text-primary">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-full">
        <Sidebar
          user={user}
          navItems={navItems}
          handleLogout={handleLogout}
          onOpenChangePassword={() => setChangePasswordOpen(true)}
          onClose={() => {}}
        />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col shadow-2xl">
            <Sidebar
              user={user}
              navItems={navItems}
              handleLogout={handleLogout}
              onOpenChangePassword={() => setChangePasswordOpen(true)}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        currentUser={user}
      />

      {/* ── Main Content Area (Header + Main Body) ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (Section 8) */}
        <header className="h-14 px-4 sm:px-6 bg-surface dark:bg-surface border-b border-border dark:border-border flex items-center justify-between shrink-0">
          {/* Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-lg text-text-secondary dark:text-text-secondary hover:bg-surface-secondary dark:hover:bg-surface-secondary lg:hidden"
              aria-label="Open Navigation"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-muted dark:text-text-muted hidden sm:inline">
                {user?.department ? `Dept. of ${user.department}` : 'RUET LabEval'}
              </span>
              <span className="text-border-strong dark:text-border-strong hidden sm:inline">•</span>
              <span className="text-xs font-medium text-text-secondary dark:text-text-secondary truncate">
                Academic Session 2024–2025
              </span>
            </div>
          </div>

          {/* Right Header Actions: Dual-Mode Switch, Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Department Head Dual-Mode Switch (Section 8, 18) */}
            {user?.role === 'department_head' && (
              <div className="flex items-center bg-surface-secondary dark:bg-surface-secondary border border-border dark:border-border p-1 rounded-xl">
                <button
                  onClick={() => handleSwitchMode('HEAD')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    headMode === 'HEAD'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary'
                  }`}
                  title="Switch to Department Administration Mode"
                >
                  <Shield size={12} />
                  <span>Head Mode</span>
                  {headMode === 'HEAD' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                  )}
                </button>
                <button
                  onClick={() => handleSwitchMode('TEACHER')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    headMode === 'TEACHER'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-text-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary'
                  }`}
                  title="Switch to Personal Instructor & Teaching Mode"
                >
                  <GraduationCap size={12} />
                  <span>Teacher Mode</span>
                  {headMode === 'TEACHER' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                  )}
                </button>
              </div>
            )}

            {/* Theme Toggle (Section 8) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-surface-secondary dark:bg-surface-secondary border border-border dark:border-border text-text-secondary dark:text-text-secondary hover:text-primary dark:hover:text-primary transition-colors"
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Page Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

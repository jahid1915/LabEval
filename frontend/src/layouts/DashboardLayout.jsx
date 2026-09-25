import { useState, useContext } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, BookOpen, Activity, HelpCircle, FileCheck,
  ClipboardList, TrendingUp, LogOut, Sun, Moon, Menu, X,
  Phone, Building2, ChevronRight, GraduationCap, Users,
  Calendar, CalendarOff, FolderTree, FileText, Bell, ChevronDown,
  Upload, History, Award, KeyRound
} from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';

/* ── Navigation Config ───────────────────────────────────── */

const adminNav = [
  { heading: 'Overview' },
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { heading: 'Institution' },
  { to: '/admin/faculties',        icon: FolderTree,      label: 'Faculties' },
  { to: '/admin/departments',      icon: Building2,       label: 'Departments' },
  { to: '/admin/sessions',         icon: Calendar,        label: 'Academic Sessions' },
  { to: '/admin/series',           icon: Users,           label: 'Series / Batches' },
  { heading: 'Academics & Courses' },
  { to: '/admin/course-catalog',   icon: BookOpen,        label: 'Course Catalog' },
  { to: '/admin/course-offerings', icon: Award,           label: 'Course Offerings' },
  { heading: 'People' },
  { to: '/admin/teachers',         icon: GraduationCap,   label: 'Teachers' },
  { to: '/admin/students',         icon: Users,           label: 'Students' },
  { heading: 'Management' },
  { to: '/admin/leaves',           icon: CalendarOff,     label: 'Leave Management' },
  { to: '/admin/announcements',    icon: Bell,            label: 'Announcements' },
  { to: '/admin/audit-logs',       icon: FileText,        label: 'Audit Logs' },
  { heading: 'Data Management' },
  { to: '/admin/import',           icon: Upload,          label: 'Import Students' },
  { to: '/admin/import-history',   icon: History,         label: 'Import History' },
];


const teacherNav = [
  { heading: 'Main' },
  { to: '/teacher',            icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/teacher/courses',   icon: BookOpen,        label: 'My Courses' },
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
];

/* ── Sidebar Component ───────────────────────────────────── */
function Sidebar({ user, navItems, isDarkMode, toggleTheme, handleLogout, onOpenChangePassword, onClose }) {
  const [profileOpen, setProfileOpen] = useState(false);

  const getRoleBadge = () => {
    if (user?.role === 'admin' || user?.role === 'department_head') return 'Department Head';
    if (user?.role === 'teacher') return 'Teacher';
    return 'Student';
  };

  const getPortalBase = () => {
    if (user?.role === 'admin' || user?.role === 'department_head') return '/admin';
    if (user?.role === 'teacher') return '/teacher';
    return '/student';
  };

  const getIdentifier = () => {
    if (user?.role === 'admin' || user?.role === 'department_head') return user?.name || user?.username || 'Department Head';
    if (user?.role === 'teacher') return user?.teacherId || 'Teacher';
    return user?.rollNumber || 'Student';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full"
      style={{ background: isDarkMode ? '#0b132b' : '#ffffff', borderRight: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}` }}>

      {/* ── Logo / Brand ── */}
      <Link to={getPortalBase()} onClick={onClose}
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}` }}>
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-transparent dark:bg-[#111c38] flex items-center justify-center p-1 shadow-sm">
          <img src="/labeval_icon.png" alt="LabEval Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold leading-tight truncate"
              style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              Lab<span className="text-blue-600 dark:text-blue-400">Eval</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 uppercase">
              RUET
            </span>
          </div>
          <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: isDarkMode ? '#38bdf8' : '#2563eb' }}>
            Lab Performance Evaluation
          </p>
        </div>
      </Link>

      {/* ── User Profile ── */}
      <div className="px-3 pt-3 pb-1">
        <button onClick={() => setProfileOpen(p => !p)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
          style={{
            background: isDarkMode ? '#111c38' : '#f8fafc',
            border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`
          }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)' }}>
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate"
              style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] font-medium truncate" style={{ color: isDarkMode ? '#818cf8' : '#6366f1' }}>
              {getRoleBadge()}
            </p>
          </div>
          <ChevronDown size={14}
            style={{
              color: isDarkMode ? '#94a3b8' : '#64748b',
              transform: profileOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms'
            }} />
        </button>

        {profileOpen && (
          <div className="mt-1 px-3 py-2.5 rounded-lg text-[11px] space-y-1.5"
            style={{
              background: isDarkMode ? '#111c38' : '#f1f5f9',
              border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`
            }}>
            <div className="flex items-center gap-2" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
              <GraduationCap size={11} />
              <span className="font-mono">{getIdentifier()}</span>
            </div>
            {user?.department && (
              <div className="flex items-center gap-2" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                <Building2 size={11} />
                <span>Dept. of {user.department}</span>
              </div>
            )}
            {user?.contactNo && (
              <div className="flex items-center gap-2" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                <Phone size={11} />
                <span>{user.contactNo}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {navItems.map((item, idx) => {
          if (item.heading) {
            return (
              <p key={`h-${idx}`}
                className="text-[10px] uppercase tracking-widest font-bold px-3 pt-4 pb-1.5 first:pt-2"
                style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                {item.heading}
              </p>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-all ${
                  isActive ? 'nav-active font-semibold' : 'nav-inactive hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                }`
              }
              style={({ isActive }) => ({
                borderLeft: isActive ? `3px solid #2563eb` : '3px solid transparent',
                background: isActive
                  ? (isDarkMode ? 'linear-gradient(90deg, rgba(37,99,235,0.2) 0%, rgba(99,102,241,0.08) 100%)' : '#eff6ff')
                  : 'transparent',
                color: isActive
                  ? (isDarkMode ? '#38bdf8' : '#1d4ed8')
                  : (isDarkMode ? '#94a3b8' : '#475569'),
              })}>
              <Icon size={15} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Bottom Controls ── */}
      <div className="px-3 py-3" style={{ borderTop: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}` }}>
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium mb-1 transition-colors"
          style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
          onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? '#1e293b' : '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>
        <button onClick={() => { onOpenChangePassword && onOpenChangePassword(); onClose && onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium mb-1 transition-colors"
          style={{ color: isDarkMode ? '#38bdf8' : '#2563eb' }}
          onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? '#1e293b' : '#eff6ff'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <KeyRound size={14} />
          Change Password (OTP)
        </button>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-colors"
          style={{ color: '#ef4444' }}
          onMouseEnter={e => { e.currentTarget.style.background = isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ── Main Layout ─────────────────────────────────────────── */
export default function DashboardLayout() {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const navigate = useNavigate();

  let navItems = studentNav;
  if (user?.role === 'teacher') navItems = teacherNav;
  if (user?.role === 'admin' || user?.role === 'department_head') navItems = adminNav;

  const handleLogout = () => { logout(); navigate('/'); };

  const bgColor    = isDarkMode ? '#0b132b' : '#f8fafc';
  const sidebarBg  = isDarkMode ? '#0b132b' : '#ffffff';
  const borderColor = isDarkMode ? '#1e293b' : '#e2e8f0';
  const headerBg   = isDarkMode ? '#0b132b' : '#ffffff';
  const headerText = isDarkMode ? '#f8fafc' : '#0f172a';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: bgColor }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full overflow-y-auto"
        style={{ background: sidebarBg, borderRight: `1px solid ${borderColor}` }}>
        <Sidebar
          user={user}
          navItems={navItems}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
          onOpenChangePassword={() => setChangePasswordOpen(true)}
          onClose={() => {}}
        />
      </aside>

      {/* ── Mobile: overlay + drawer ── */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-40 w-64 flex flex-col lg:hidden overflow-y-auto"
            style={{ background: sidebarBg, borderRight: `1px solid ${borderColor}` }}>
            <div className="flex items-center justify-end px-4 pt-3 pb-1">
              <button onClick={() => setMobileSidebarOpen(false)}
                style={{ color: isDarkMode ? '#8ba99b' : '#6b7280' }}>
                <X size={18} />
              </button>
            </div>
            <Sidebar
              user={user}
              navItems={navItems}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              handleLogout={handleLogout}
              onOpenChangePassword={() => setChangePasswordOpen(true)}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      {/* ── Change Password Modal ── */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        currentUser={user}
      />

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile Header */}
        <header className="flex items-center gap-3 px-4 py-3 lg:hidden"
          style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
          <button onClick={() => setMobileSidebarOpen(true)}
            style={{ color: isDarkMode ? '#8ba99b' : '#6b7280' }}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/labeval_icon.png" alt="LabEval" className="w-6 h-6 object-contain" />
            <span className="text-[14px] font-bold" style={{ color: headerText }}>
              Lab<span className="text-blue-600 dark:text-blue-400">Eval</span>
            </span>
          </div>
          <div className="ml-auto">
            <button onClick={toggleTheme} style={{ color: isDarkMode ? '#8ba99b' : '#6b7280' }}>
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto" style={{ background: bgColor }}>
          <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-7xl 2xl:max-w-[1760px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

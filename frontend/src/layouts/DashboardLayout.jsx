import { useState, useContext } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, BookOpen, Activity, HelpCircle, FileCheck,
  ClipboardList, TrendingUp, LogOut, Sun, Moon, Menu,
  Phone, Building2, ChevronDown, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const teacherNav = [
  { to:'/teacher',             icon:<LayoutDashboard size={18}/>, label:'Dashboard',       end:true },
  { to:'/teacher/courses',     icon:<BookOpen size={18}/>,        label:'Courses' },
  { to:'/teacher/attendance',  icon:<ClipboardList size={18}/>,   label:'Attendance & Report' },
  { to:'/teacher/performance', icon:<Activity size={18}/>,        label:'Lab Performance' },
  { to:'/teacher/quiz',        icon:<HelpCircle size={18}/>,      label:'Lab Quiz' },
  { to:'/teacher/test',        icon:<FileCheck size={18}/>,       label:'Lab Test' },
  { to:'/teacher/others',      icon:<ClipboardList size={18}/>,   label:'Others' },
  { to:'/teacher/results',     icon:<TrendingUp size={18}/>,      label:'Final Result' },
];

const studentNav = [
  { to:'/student', icon:<LayoutDashboard size={18}/>, label:'My Courses', end:true },
];

const adminNav = [
  { to:'/admin', icon:<LayoutDashboard size={18}/>, label:'Admin Hub', end:true },
];

const SidebarContent = ({
  user,
  profileExpanded,
  setProfileExpanded,
  navItems,
  activeClass,
  inactiveClass,
  isDarkMode,
  toggleTheme,
  handleLogout
}) => {
  const getRoleBadge = () => {
    if (user?.role === 'admin') return 'Admin Console';
    if (user?.role === 'teacher') return 'Teacher Portal';
    return 'Student Portal';
  };

  const getPortalLink = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'teacher') return '/teacher';
    return '/student';
  };

  const getSubtext = () => {
    if (user?.role === 'admin') return user?.username || 'Administrator';
    if (user?.role === 'teacher') return user?.teacherId || 'Faculty';
    return user?.rollNumber || 'Student';
  };

  return (
  <div className="flex flex-col h-full">
    {/* Logo */}
    <Link to={getPortalLink()}
      className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-800">
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 shrink-0">
        <img src="/RUET.png" alt="RUET" className="w-7 h-7 object-contain"
          onError={e => { e.target.style.display='none'; }}/>
      </div>
      <div>
        <p className="font-heading font-extrabold text-sm text-slate-900 dark:text-white leading-tight">LabEval RUET</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{getRoleBadge()}</p>
      </div>
    </Link>

    {/* Profile Section */}
    <div className="mx-3 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
      <button onClick={() => setProfileExpanded(!profileExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
          user?.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-primary to-accent'
        }`}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{user?.name || 'User'}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {getSubtext()}
          </p>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${profileExpanded ? 'rotate-180' : ''}`}/>
      </button>
      <AnimatePresence>
        {profileExpanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            className="overflow-hidden">
            <div className="px-4 py-3 space-y-2 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Phone size={12} className="shrink-0"/>
                <span className="truncate">{user?.contactNo || '—'}</span>
              </div>
              {user?.department && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Building2 size={12} className="shrink-0"/>
                  <span>{user?.department}</span>
                </div>
              )}
              {user?.role === 'student' && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <GraduationCap size={12} className="shrink-0"/>
                  <span>Series {user?.series || '—'}</span>
                </div>
              )}
              {user?.role === 'admin' && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-bold">
                  <span>Super Admin Privilege</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Nav Links */}
    <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
      {navItems.map(({ to, icon, label, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? activeClass : inactiveClass}>
          {icon} {label}
        </NavLink>
      ))}
    </nav>

    {/* Bottom Controls */}
    <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
      <button onClick={toggleTheme}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary transition-all">
        {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
      <button onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 dark:hover:text-rose-400 transition-all">
        <LogOut size={18}/> Log Out
      </button>
    </div>
  </div>
  );
};

export default function DashboardLayout() {
  const { user, logout }          = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const navigate = useNavigate();

  let navItems = studentNav;
  if (user?.role === 'teacher') navItems = teacherNav;
  if (user?.role === 'admin')   navItems = adminNav;

  const handleLogout = () => { logout(); navigate('/'); };

  const activeClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm bg-primary/10 text-primary";
  const inactiveClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary transition-all";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-y-auto">
        <SidebarContent
          user={user}
          profileExpanded={profileExpanded}
          setProfileExpanded={setProfileExpanded}
          navItems={navItems}
          activeClass={activeClass}
          inactiveClass={inactiveClass}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
        />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"/>
            <motion.aside initial={{ x:-288 }} animate={{ x:0 }} exit={{ x:-288 }} transition={{ type:'spring', damping:25 }}
              className="fixed left-0 top-0 bottom-0 z-40 w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col lg:hidden overflow-y-auto">
              <SidebarContent
                user={user}
                profileExpanded={profileExpanded}
                setProfileExpanded={setProfileExpanded}
                navItems={navItems}
                activeClass={activeClass}
                inactiveClass={inactiveClass}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                handleLogout={handleLogout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar (mobile) */}
        <header className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Menu size={22}/>
          </button>
          <span className="font-heading font-extrabold text-slate-800 dark:text-white">LabEval RUET</span>
          <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}

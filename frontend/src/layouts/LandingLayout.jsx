import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function LandingLayout() {
  const [isScrolled, setIsScrolled]     = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authSlider, setAuthSlider]     = useState('login'); // 'login' | 'signup'
  const { isDarkMode, toggleTheme }     = useTheme();
  const location                        = useLocation();
  const navigate                        = useNavigate();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  const navLinks = [
    { label: 'Home',    path: '/'        },
    { label: 'About',   path: '/about'   },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = path => location.pathname === path;

  const handleAuth = (type) => {
    setAuthSlider(type);
    // Default to teacher for both login and signup
    navigate(type === 'login' ? '/login/teacher' : '/signup/teacher');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">

      {/* ── Sticky Navbar ──────────────────────────────────────────── */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-sm border-b border-slate-200/50 dark:border-slate-800/60'
          : 'py-4 bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between gap-4">

          {/* ── LEFT: Logo Circle ────────────────────────── */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/30">
              <img src="/ruet_logo.svg" alt="RUET" className="w-6 h-6 object-contain brightness-0 invert"/>
            </div>
            <span className="font-heading font-extrabold text-lg tracking-tight text-slate-900 dark:text-white hidden sm:block">
              LabSync <span className="text-primary">RUET</span>
            </span>
          </Link>

          {/* ── CENTER: Nav Links (desktop) ───────────────── */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, path }) => (
              <Link key={path} to={path}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(path)
                    ? 'text-primary bg-primary/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/5 dark:hover:text-primary dark:hover:bg-primary/10'
                }`}>
                {label}
              </Link>
            ))}
          </nav>

          {/* ── RIGHT: Theme + Login/Signup Slider ───────── */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme">
              {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>

            {/* Login / Sign Up Slider Pill */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 gap-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleAuth('login')}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                  authSlider === 'login'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                Log In
              </button>
              <button
                onClick={() => handleAuth('signup')}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                  authSlider === 'signup'
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}>
                Sign Up
              </button>
            </div>
          </div>

          {/* ── Mobile: Theme + Hamburger ─────────────────── */}
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-300">
              {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu ───────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 z-40 bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl flex flex-col items-center justify-center gap-6 md:hidden">
            {navLinks.map(({ label, path }) => (
              <Link key={path} to={path}
                className="text-2xl font-heading font-bold text-slate-800 dark:text-white hover:text-primary transition-colors">
                {label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-4 w-48">
              <button onClick={() => { navigate('/login/teacher'); setMobileMenuOpen(false); }}
                className="w-full py-3 rounded-full border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-base hover:border-primary hover:text-primary transition-colors">
                Log In
              </button>
              <button onClick={() => { navigate('/signup/teacher'); setMobileMenuOpen(false); }}
                className="w-full py-3 rounded-full bg-primary text-white font-bold text-base shadow-lg shadow-primary/30">
                Sign Up
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Content ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <img src="/ruet_logo.svg" alt="RUET" className="w-5 h-5 object-contain brightness-0 invert"/>
              </div>
              <span className="font-heading font-bold text-lg text-white">LabSync RUET</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Next-generation laboratory performance tracking for RUET.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3 font-heading">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {navLinks.map(({ label, path }) => (
                <li key={path}><Link to={path} className="hover:text-primary transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-3 font-heading">Portal Access</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login/teacher" className="hover:text-primary transition-colors">Teacher Login</Link></li>
              <li><Link to="/login/student" className="hover:text-primary transition-colors">Student Login</Link></li>
              <li><Link to="/signup/teacher" className="hover:text-primary transition-colors">Teacher Sign Up</Link></li>
              <li><Link to="/signup/student" className="hover:text-primary transition-colors">Student Sign Up</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 text-xs flex flex-col md:flex-row justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} Rajshahi University of Engineering & Technology. All rights reserved.</p>
          <p>Powered by LabSync RUET</p>
        </div>
      </footer>
    </div>
  );
}

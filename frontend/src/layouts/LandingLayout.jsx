import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export default function LandingLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Home',             path: '/',         isAnchor: false },
    { label: 'Features',         path: '#features', isAnchor: true  },
    { label: 'Academic Flow',    path: '#workflow', isAnchor: true  },
    { label: 'Platform Preview', path: '#preview',  isAnchor: true  },
    { label: 'Roles',            path: '#roles',    isAnchor: true  },
    { label: 'About',            path: '/about',    isAnchor: false },
  ];

  const handleNavClick = (link) => {
    setMobileMenuOpen(false);
    if (link.isAnchor) {
      if (location.pathname !== '/') {
        navigate(`/${link.path}`);
      } else {
        const el = document.querySelector(link.path);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b132b] text-slate-800 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">

      {/* ── Sticky Transparent / Blur Navbar (Section 18) ──────────── */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'py-2.5 bg-white/90 dark:bg-[#0b132b]/90 backdrop-blur-md shadow-sm border-b border-slate-200/70 dark:border-[#1e293b]'
          : 'py-4 bg-transparent'
      }`}>
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">

          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-transparent dark:bg-[#111c38] flex items-center justify-center shadow-sm border border-blue-200/80 dark:border-blue-900/50 group-hover:scale-105 transition-transform p-1">
              <img src="/labeval_icon.png" alt="LabEval Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  Lab<span className="text-blue-600 dark:text-blue-400">Eval</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 uppercase">
                  RUET
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
                Lab Performance Evaluation
              </span>
            </div>
          </Link>

          {/* Center: Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              link.isAnchor ? (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 transition-colors"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    location.pathname === link.path
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>

          {/* Right: Theme Toggle + Sign In */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#111c38] transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/login"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-1.5"
            >
              <span>Sign In</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#111c38]"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
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
            className="fixed inset-0 z-40 bg-white/98 dark:bg-[#0b132b]/98 backdrop-blur-xl flex flex-col items-center justify-center gap-5 lg:hidden px-6"
          >
            {navLinks.map((link) => (
              link.isAnchor ? (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className="text-lg font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </Link>
              )
            ))}

            <div className="w-full max-w-xs pt-4 border-t border-slate-200 dark:border-[#1e293b] space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center text-sm font-bold block shadow-md"
              >
                Sign In to Platform
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Content ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* ── Footer (Multi-Color Accents) ───────────────────────────── */}
      <footer className="bg-[#070d1e] dark:bg-[#050814] text-slate-400 py-12 mt-auto border-t border-slate-800">
        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center p-1">
                <img src="/labeval_icon.png" alt="LabEval" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <span className="font-heading font-bold text-base text-white block">
                  Lab<span className="text-blue-400">Eval</span> &bull; RUET
                </span>
                <span className="text-[11px] text-blue-400 font-medium tracking-wide">
                  Lab Performance Evaluation System
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An institutional operating system designed for Rajshahi University of Engineering & Technology. Unifying curriculum governance, teacher assignments, student academic evaluation, and verified reports.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#workflow" className="hover:text-blue-400 transition-colors">Academic Flow</a></li>
              <li><a href="#preview" className="hover:text-blue-400 transition-colors">Platform Preview</a></li>
              <li><a href="#roles" className="hover:text-blue-400 transition-colors">Roles & Responsibilities</a></li>
              <li><Link to="/about" className="hover:text-blue-400 transition-colors">About System</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">Portals</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/login" className="hover:text-blue-400 transition-colors flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Department Head Portal</Link></li>
              <li><Link to="/login" className="hover:text-blue-400 transition-colors flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Teacher Portal</Link></li>
              <li><Link to="/login" className="hover:text-blue-400 transition-colors flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Student Portal</Link></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl 2xl:max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800/80 text-xs flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500">
          <p>&copy; 2026 RUET Lab Performance Evaluation. All rights reserved.</p>
          <p className="text-[11px]">
            Rajshahi University of Engineering & Technology (RUET)
          </p>
        </div>
      </footer>

    </div>
  );
}

import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import {
  GraduationCap, User, Shield, Eye, EyeOff,
  Sun, Moon, Lock, Phone, Hash, Building2, FolderTree,
  AlertCircle, ChevronRight, LogIn, KeyRound
} from 'lucide-react';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import CustomSelect from '../../components/CustomSelect';

const DEPARTMENTS = ['CSE', 'EEE', 'ME', 'CIVIL', 'ETE', 'ECE', 'IPE', 'MSE', 'CME', 'MTE', 'BECM', 'ARCHI'];

const DEPARTMENT_DETAILS = [
  { code: 'CSE', name: 'Computer Science & Engineering', label: 'CSE', sublabel: 'Computer Science & Engineering' },
  { code: 'EEE', name: 'Electrical & Electronic Engineering', label: 'EEE', sublabel: 'Electrical & Electronic Engineering' },
  { code: 'ME', name: 'Mechanical Engineering', label: 'ME', sublabel: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering', label: 'CIVIL', sublabel: 'Civil Engineering' },
  { code: 'ETE', name: 'Electronics & Telecommunication Engineering', label: 'ETE', sublabel: 'Electronics & Telecommunication Engineering' },
  { code: 'ECE', name: 'Electrical & Computer Engineering', label: 'ECE', sublabel: 'Electrical & Computer Engineering' },
  { code: 'IPE', name: 'Industrial & Production Engineering', label: 'IPE', sublabel: 'Industrial & Production Engineering' },
  { code: 'MSE', name: 'Materials Science & Engineering', label: 'MSE', sublabel: 'Materials Science & Engineering' },
  { code: 'CME', name: 'Ceramic & Metallurgical Engineering', label: 'CME', sublabel: 'Ceramic & Metallurgical Engineering' },
  { code: 'MTE', name: 'Mechatronics Engineering', label: 'MTE', sublabel: 'Mechatronics Engineering' },
  { code: 'BECM', name: 'Building Engineering & Construction Management', label: 'BECM', sublabel: 'Building Engineering & Construction Management' },
  { code: 'ARCHI', name: 'Architecture', label: 'ARCHI', sublabel: 'Architecture' },
];

const RUET_FACULTIES = [
  {
    code: 'ECE',
    name: 'Faculty of Electrical & Computer Engineering',
    departments: [
      { code: 'ETE', name: 'Electronics & Telecommunication Engineering' },
      { code: 'CSE', name: 'Computer Science & Engineering' },
      { code: 'EEE', name: 'Electrical & Electronic Engineering' },
      { code: 'ECE', name: 'Electrical & Computer Engineering' },
    ]
  },
  {
    code: 'CE',
    name: 'Faculty of Civil Engineering',
    departments: [
      { code: 'CE', name: 'Civil Engineering' },
      { code: 'URP', name: 'Urban & Regional Planning' },
      { code: 'ARCH', name: 'Architecture' },
      { code: 'BECM', name: 'Building Engineering & Construction Management' },
    ]
  },
  {
    code: 'ME',
    name: 'Faculty of Mechanical Engineering',
    departments: [
      { code: 'ME', name: 'Mechanical Engineering' },
      { code: 'IPE', name: 'Industrial & Production Engineering' },
      { code: 'MTE', name: 'Mechatronics Engineering' },
      { code: 'CME', name: 'Ceramic & Metallurgical Engineering' },
      { code: 'MSE', name: 'Materials Science & Engineering' },
      { code: 'CHE', name: 'Chemical Engineering' },
    ]
  },
  {
    code: 'ASE',
    name: 'Faculty of Applied Science & Humanities',
    departments: [
      { code: 'MATH', name: 'Mathematics' },
      { code: 'CHEM', name: 'Chemistry' },
      { code: 'PHY', name: 'Physics' },
      { code: 'HUM', name: 'Humanities' },
    ]
  }
];

/* ── Form Field Components ────────────────────────────────── */
function FormField({ label, icon: Icon, children }) {
  return (
    <div style={{ minWidth: 0, width: '100%' }}>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#6b7280',
        marginBottom: '5px'
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */
export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();

  const initialRole = location.pathname.includes('admin')
    ? 'admin'
    : location.pathname.includes('teacher')
    ? 'teacher'
    : 'student';
  const initialMode = location.pathname.includes('signup') ? 'signup' : 'login';

  const [role, setRole] = useState(initialRole);
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    if (location.pathname.includes('admin')) setRole('admin');
    else if (location.pathname.includes('teacher')) setRole('teacher');
    else if (location.pathname.includes('student')) setRole('student');
    if (location.pathname.includes('signup')) setMode('signup');
    else setMode('login');
  }, [location.pathname]);

  const [studentForm, setStudentForm] = useState({
    rollNumber: '', name: '', series: '', department: 'ETE',
    contactNo: '', password: '', confirmPassword: '',
  });
  const [teacherForm, setTeacherForm] = useState({
    teacherId: '', name: '', department: 'ETE',
    contactNo: '', password: '', confirmPassword: '',
  });
  const [adminForm, setAdminForm] = useState({
    username: '', password: '', name: '', email: '',
    faculty: 'Faculty of Electrical & Computer Engineering',
    facultyCode: 'ECE',
    department: 'Electronics & Telecommunication Engineering',
    departmentCode: 'ETE',
    designation: 'Professor & Head',
    contactNo: '', confirmPassword: '',
  });

  const handleStudentChange = e => setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  const handleTeacherChange = e => setTeacherForm({ ...teacherForm, [e.target.name]: e.target.value });
  const handleAdminChange   = e => setAdminForm({ ...adminForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (role === 'student') {
        if (mode === 'login') {
          const res = await login('student', { rollNumber: studentForm.rollNumber.trim(), password: studentForm.password });
          if (res.success) { toast.success(`Welcome, ${res.user?.name || 'Student'}!`); navigate('/student'); }
          else toast.error(res.message);
        } else {
          if (studentForm.password !== studentForm.confirmPassword) { setLoading(false); return toast.error('Passwords do not match'); }
          if (studentForm.password.length < 6) { setLoading(false); return toast.error('Password must be at least 6 characters'); }
          const { confirmPassword, ...payload } = studentForm;
          const res = await register('student', { ...payload, rollNumber: payload.rollNumber.trim() });
          if (res.success) { toast.success('Student account created!'); navigate('/student'); }
          else toast.error(res.message);
        }
      } else if (role === 'teacher') {
        if (mode === 'login') {
          const res = await login('teacher', { teacherId: teacherForm.teacherId.trim().toUpperCase(), password: teacherForm.password });
          if (res.success) { toast.success(`Welcome, ${res.user?.name || 'Instructor'}!`); navigate('/teacher'); }
          else toast.error(res.message);
        } else {
          if (teacherForm.password !== teacherForm.confirmPassword) { setLoading(false); return toast.error('Passwords do not match'); }
          if (teacherForm.password.length < 6) { setLoading(false); return toast.error('Password must be at least 6 characters'); }
          const { confirmPassword, ...payload } = teacherForm;
          const res = await register('teacher', { ...payload, teacherId: payload.teacherId.trim().toUpperCase() });
          if (res.success) { toast.success('Teacher account created!'); navigate('/teacher'); }
          else toast.error(res.message);
        }
      } else if (role === 'admin') {
        if (mode === 'login') {
          const res = await login('admin', { username: adminForm.username.trim(), password: adminForm.password });
          if (res.success) { toast.success('Department Head access verified.'); navigate('/admin'); }
          else toast.error(res.message);
        } else {
          if (adminForm.password !== adminForm.confirmPassword) { setLoading(false); return toast.error('Passwords do not match'); }
          const { confirmPassword, faculty, department, ...rest } = adminForm;
          const res = await register('admin', {
            ...rest,
            facultyCode: adminForm.facultyCode,
            facultyName: adminForm.faculty,
            departmentCode: adminForm.departmentCode,
            departmentName: adminForm.department,
          });
          if (res.success) { toast.success(`Dept. Head account created for ${adminForm.departmentCode}!`); navigate('/admin'); }
          else toast.error(res.message);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Multi-Color Theme Design Tokens ── */
  const bg = isDarkMode ? '#0b132b' : '#f8fafc';
  const card = isDarkMode ? '#0f172a' : '#ffffff';
  const border = isDarkMode ? '#1e293b' : '#e2e8f0';
  const textMain = isDarkMode ? '#f8fafc' : '#0f172a';
  const textMuted = isDarkMode ? '#94a3b8' : '#64748b';

  const inputStyle = {
    width: '100%',
    height: '42px',
    boxSizing: 'border-box',
    minWidth: 0,
    padding: '10px 14px',
    background: isDarkMode ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 150ms, box-shadow 150ms',
  };

  const selectStyle = { ...inputStyle };

  const roleButtons = [
    { key: 'admin',   label: 'Department Head', Icon: Shield,        desc: 'Department authority', color: '#2563eb' },
    { key: 'teacher', label: 'Teacher',         Icon: User,          desc: 'Faculty evaluation',   color: '#6366f1' },
    { key: 'student', label: 'Student',         Icon: GraduationCap, desc: 'Academic records',     color: '#06b6d4' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      backgroundImage: `
        linear-gradient(${isDarkMode ? 'rgba(56, 189, 248, 0.03)' : 'rgba(37, 99, 235, 0.03)'} 1px, transparent 1px),
        linear-gradient(90deg, ${isDarkMode ? 'rgba(56, 189, 248, 0.03)' : 'rgba(37, 99, 235, 0.03)'} 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>

      {/* ── Top Bar ── */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: textMuted,
          textDecoration: 'none',
        }}>
          ← Back to Home
        </Link>
        <button onClick={toggleTheme} style={{
          padding: '6px 10px',
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 6,
          color: textMuted,
          cursor: 'pointer',
        }}>
          {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* ── Main Card ── */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 12,
        boxShadow: isDarkMode ? '0 12px 32px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.06)',
        position: 'relative',
      }}>

        {/* Card Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${border}`,
          borderTopLeftRadius: 11,
          borderTopRightRadius: 11,
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: '12px',
            border: `1px solid ${isDarkMode ? 'rgba(56,189,248,0.2)' : 'rgba(37,99,235,0.2)'}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDarkMode ? '#0b132b' : '#eff6ff',
            flexShrink: 0,
            padding: '4px',
          }}>
            <img src="/labeval_icon.png" alt="LabEval Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span style="color:#2563eb;font-weight:700;font-size:15px">LE</span>';
              }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: textMain, lineHeight: 1.2 }}>
                Lab<span style={{ color: '#2563eb' }}>Eval</span>
              </p>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                background: isDarkMode ? 'rgba(37,99,235,0.2)' : '#dbeafe',
                color: isDarkMode ? '#93c5fd' : '#1e40af',
                border: `1px solid ${isDarkMode ? 'rgba(59,130,246,0.3)' : '#bfdbfe'}`,
              }}>
                RUET
              </span>
            </div>
            <p style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
              Lab Performance Evaluation System
            </p>
          </div>
        </div>

        {/* Multi-Color Role Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
          {roleButtons.map(({ key, label, Icon, color }) => {
            const isActive = role === key;
            return (
              <button key={key}
                onClick={() => setRole(key)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '12px 8px',
                  background: isActive ? (isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.8)') : 'transparent',
                  borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                  color: isActive ? color : textMuted,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 150ms',
                }}>
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', margin: '16px 24px 0', background: isDarkMode ? '#1e293b' : '#f1f5f9', borderRadius: 8, padding: 3, border: `1px solid ${border}` }}>
          {['login', 'signup'].map(m => {
            const isModeActive = mode === m;
            const activeColor = role === 'admin' ? '#2563eb' : role === 'teacher' ? '#6366f1' : '#06b6d4';
            return (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: isModeActive ? (isDarkMode ? '#0f172a' : '#ffffff') : 'transparent',
                  color: isModeActive ? activeColor : textMuted,
                  boxShadow: isModeActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: isModeActive ? `1px solid ${border}` : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}>
                {m === 'login' ? 'Sign In' : (role === 'admin' ? 'Register Dept. Head' : 'Create Account')}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── STUDENT LOGIN ── */}
            {role === 'student' && mode === 'login' && (
              <>
                <FormField label="Student Roll Number">
                  <input type="text" name="rollNumber" required placeholder="e.g. 2211001"
                    value={studentForm.rollNumber} onChange={handleStudentChange}
                    style={inputStyle} onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                </FormField>
                <FormField label="Password">
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} name="password" required placeholder="••••••••"
                      value={studentForm.password} onChange={handleStudentChange}
                      style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </FormField>
              </>
            )}

            {/* ── STUDENT SIGNUP ── */}
            {role === 'student' && mode === 'signup' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Full Name">
                    <input type="text" name="name" required placeholder="e.g. Md. Jahid Hasan"
                      value={studentForm.name} onChange={handleStudentChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Academic Series">
                    <input type="text" name="series" required placeholder="e.g. 22"
                      value={studentForm.series} onChange={handleStudentChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Roll Number">
                    <input type="text" name="rollNumber" required placeholder="e.g. 2211001"
                      value={studentForm.rollNumber} onChange={handleStudentChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Department">
                    <CustomSelect
                      value={studentForm.department}
                      onChange={(val) => setStudentForm({ ...studentForm, department: val })}
                      options={DEPARTMENT_DETAILS}
                      placeholder="Select Department"
                      icon={Building2}
                      isDarkMode={isDarkMode}
                      align="right"
                    />
                  </FormField>
                </div>
                <FormField label="Contact Number">
                  <input type="text" name="contactNo" required placeholder="e.g. 017xxxxxxxx"
                    value={studentForm.contactNo} onChange={handleStudentChange} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Password">
                    <input type="password" name="password" required placeholder="Min 6 characters"
                      value={studentForm.password} onChange={handleStudentChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Confirm Password">
                    <input type="password" name="confirmPassword" required placeholder="Confirm password"
                      value={studentForm.confirmPassword} onChange={handleStudentChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
              </>
            )}

            {/* ── TEACHER LOGIN ── */}
            {role === 'teacher' && mode === 'login' && (
              <>
                <FormField label="Teacher ID Code">
                  <input type="text" name="teacherId" required placeholder="e.g. ETE-294 or AIS"
                    value={teacherForm.teacherId} onChange={handleTeacherChange} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                </FormField>
                <FormField label="Password">
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} name="password" required placeholder="••••••••"
                      value={teacherForm.password} onChange={handleTeacherChange}
                      style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </FormField>
              </>
            )}

            {/* ── TEACHER SIGNUP ── */}
            {role === 'teacher' && mode === 'signup' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Full Name">
                    <input type="text" name="name" required placeholder="e.g. Dr. Jane Smith"
                      value={teacherForm.name} onChange={handleTeacherChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Teacher ID">
                    <input type="text" name="teacherId" required placeholder="e.g. ETE-294"
                      value={teacherForm.teacherId} onChange={handleTeacherChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Department">
                    <CustomSelect
                      value={teacherForm.department}
                      onChange={(val) => setTeacherForm({ ...teacherForm, department: val })}
                      options={DEPARTMENT_DETAILS}
                      placeholder="Select Department"
                      icon={Building2}
                      isDarkMode={isDarkMode}
                      align="left"
                    />
                  </FormField>
                  <FormField label="Contact Number">
                    <input type="text" name="contactNo" required placeholder="e.g. 017xxxxxxxx"
                      value={teacherForm.contactNo} onChange={handleTeacherChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Password">
                    <input type="password" name="password" required placeholder="Min 6 characters"
                      value={teacherForm.password} onChange={handleTeacherChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Confirm Password">
                    <input type="password" name="confirmPassword" required placeholder="Confirm password"
                      value={teacherForm.confirmPassword} onChange={handleTeacherChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
              </>
            )}

            {/* ── ADMIN LOGIN ── */}
            {role === 'admin' && mode === 'login' && (
              <>
                <div style={{
                  padding: '10px 12px',
                  background: isDarkMode ? '#1a2a1e' : '#f0fdf4',
                  border: `1px solid ${isDarkMode ? '#3d6b4f' : '#bbf7d0'}`,
                  borderRadius: 6,
                  fontSize: 11,
                  color: isDarkMode ? '#6aaa85' : '#166534',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <Shield size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Department Heads access their authorized departmental management console.</span>
                </div>
                <FormField label="Username or Email">
                  <input type="text" name="username" required placeholder="e.g. head-ete or head@ete.ruet.ac.bd"
                    value={adminForm.username} onChange={handleAdminChange} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                </FormField>
                <FormField label="Password">
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} name="password" required placeholder="••••••••"
                      value={adminForm.password} onChange={handleAdminChange}
                      style={{ ...inputStyle, paddingRight: 40 }}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </FormField>
              </>
            )}

            {/* ── ADMIN SIGNUP ── */}
            {role === 'admin' && mode === 'signup' && (
              <>
                <div style={{
                  padding: '10px 12px',
                  background: isDarkMode ? '#1a2a1e' : '#f0fdf4',
                  border: `1px solid ${isDarkMode ? '#3d6b4f' : '#bbf7d0'}`,
                  borderRadius: 6,
                  fontSize: 11,
                  color: isDarkMode ? '#6aaa85' : '#166534',
                }}>
                  <strong>Department Head Registration:</strong> Select your faculty and department. Your account will exclusively manage that department's academic records.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Faculty">
                    <CustomSelect
                      value={adminForm.facultyCode}
                      onChange={(fCode) => {
                        const foundFac = RUET_FACULTIES.find(f => f.code === fCode);
                        const firstDept = foundFac?.departments[0];
                        setAdminForm({ ...adminForm, facultyCode: fCode, faculty: foundFac?.name || '', departmentCode: firstDept?.code || '', department: firstDept?.name || '' });
                      }}
                      options={RUET_FACULTIES.map(f => ({ value: f.code, label: f.code, sublabel: f.name }))}
                      placeholder="Select Faculty"
                      icon={FolderTree}
                      isDarkMode={isDarkMode}
                      align="left"
                    />
                  </FormField>
                  <FormField label="Department">
                    <CustomSelect
                      value={adminForm.departmentCode}
                      onChange={(dCode) => {
                        const currentFac = RUET_FACULTIES.find(f => f.code === adminForm.facultyCode);
                        const foundDept = currentFac?.departments.find(d => d.code === dCode);
                        setAdminForm({ ...adminForm, departmentCode: dCode, department: foundDept?.name || '' });
                      }}
                      options={(RUET_FACULTIES.find(f => f.code === adminForm.facultyCode)?.departments || []).map(d => ({
                        value: d.code,
                        label: d.code,
                        sublabel: d.name
                      }))}
                      placeholder="Select Department"
                      icon={Building2}
                      isDarkMode={isDarkMode}
                      align="right"
                    />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Full Name">
                    <input type="text" name="name" required placeholder="e.g. Prof. Dr. M. Rahman"
                      value={adminForm.name} onChange={handleAdminChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Designation">
                    <input type="text" name="designation" required placeholder="e.g. Professor & Head"
                      value={adminForm.designation} onChange={handleAdminChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Username">
                    <input type="text" name="username" required placeholder="e.g. head_ete"
                      value={adminForm.username} onChange={handleAdminChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Email Address">
                    <input type="email" name="email" required placeholder="head@ete.ruet.ac.bd"
                      value={adminForm.email} onChange={handleAdminChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Password">
                    <input type="password" name="password" required placeholder="Min 6 characters"
                      value={adminForm.password} onChange={handleAdminChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                  <FormField label="Confirm Password">
                    <input type="password" name="confirmPassword" required placeholder="Confirm password"
                      value={adminForm.confirmPassword} onChange={handleAdminChange} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1a5f3f'; e.target.style.boxShadow = '0 0 0 3px rgba(26,95,63,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = isDarkMode ? '#3d6b4f' : '#d1d5db'; e.target.style.boxShadow = 'none'; }} />
                  </FormField>
                </div>
              </>
            )}

            {/* ── Submit Button ── */}
            {(() => {
              const btnGrad = role === 'admin'
                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                : role === 'teacher'
                ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)';
              const btnShadow = role === 'admin'
                ? '0 4px 14px rgba(37,99,235,0.35)'
                : role === 'teacher'
                ? '0 4px 14px rgba(99,102,241,0.35)'
                : '0 4px 14px rgba(6,182,212,0.35)';

              return (
                <button type="submit" disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    background: loading ? '#64748b' : btnGrad,
                    boxShadow: loading ? 'none' : btnShadow,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 6,
                    transition: 'all 150ms ease-out',
                  }}>
                  {loading ? (
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                  ) : (
                    <>
                      <LogIn size={15} />
                      {mode === 'login'
                        ? `Sign In as ${role === 'admin' ? 'Department Head' : role === 'teacher' ? 'Teacher' : 'Student'}`
                        : `Create ${role === 'admin' ? 'Department Head' : role === 'teacher' ? 'Teacher' : 'Student'} Account`}
                    </>
                  )}
                </button>
              );
            })()}

            {/* ── Forgot / Change Password Link ── */}
            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isDarkMode ? '#60a5fa' : '#2563eb',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    transition: 'all 150ms ease-out'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDarkMode ? 'rgba(96,165,250,0.12)' : '#eff6ff';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  <KeyRound size={13} />
                  <span>Forgot or Change Password? (Gmail OTP)</span>
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          initialRole={role}
          initialIdentifier={
            role === 'student' ? studentForm.rollNumber :
            role === 'teacher' ? teacherForm.teacherId :
            adminForm.username
          }
        />

        {/* Card Footer */}
        <div style={{
          borderTop: `1px solid ${border}`,
          borderBottomLeftRadius: 11,
          borderBottomRightRadius: 11,
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: 11,
          color: textMuted,
        }}>
          RUET Lab Performance Evaluation &bull; Strictly Authorized Access Only
        </div>
      </div>
    </div>
  );
}

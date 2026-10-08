import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';
import {
  GraduationCap, User, Shield, Eye, EyeOff,
  Sun, Moon, Lock, Phone, Hash, Building2, FolderTree,
  AlertCircle, ChevronRight, LogIn, KeyRound, Mail, UserCheck
} from 'lucide-react';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import CustomSelect from '../../components/CustomSelect';
import RuetLogo from '../../components/RuetLogo';

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

const ALL_DEPARTMENTS = [
  { code: 'ETE', name: 'Electronics & Telecommunication Engineering', faculty: 'Faculty of Electrical & Computer Engineering' },
  { code: 'CSE', name: 'Computer Science & Engineering', faculty: 'Faculty of Electrical & Computer Engineering' },
  { code: 'EEE', name: 'Electrical & Electronic Engineering', faculty: 'Faculty of Electrical & Computer Engineering' },
  { code: 'ECE', name: 'Electrical & Computer Engineering', faculty: 'Faculty of Electrical & Computer Engineering' },
  { code: 'CE', name: 'Civil Engineering', faculty: 'Faculty of Civil Engineering' },
  { code: 'URP', name: 'Urban & Regional Planning', faculty: 'Faculty of Civil Engineering' },
  { code: 'ARCH', name: 'Architecture', faculty: 'Faculty of Civil Engineering' },
  { code: 'BECM', name: 'Building Engineering & Construction Management', faculty: 'Faculty of Civil Engineering' },
  { code: 'ME', name: 'Mechanical Engineering', faculty: 'Faculty of Mechanical Engineering' },
  { code: 'IPE', name: 'Industrial & Production Engineering', faculty: 'Faculty of Mechanical Engineering' },
  { code: 'MTE', name: 'Mechatronics Engineering', faculty: 'Faculty of Mechanical Engineering' },
  { code: 'MSE', name: 'Materials Science & Engineering', faculty: 'Faculty of Mechanical Engineering' },
  { code: 'CME', name: 'Ceramic & Metallurgical Engineering', faculty: 'Faculty of Mechanical Engineering' },
  { code: 'CHE', name: 'Chemical Engineering', faculty: 'Faculty of Mechanical Engineering' },
];

function FormField({ label, children }) {
  return (
    <div style={{ minWidth: 0, width: '100%' }}>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#64748b',
        marginBottom: '5px'
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, name, placeholder = '••••••••', show, onToggle, isDarkMode, border }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        required
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          width: '100%',
          height: '42px',
          padding: '10px 40px 10px 14px',
          background: isDarkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${border}`,
          borderRadius: '8px',
          fontSize: '13px',
          color: isDarkMode ? '#f8fafc' : '#0f172a',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle password visibility"
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();

  // Roles available in public UI: exactly 'student', 'teacher', 'head'
  // Admin is strictly hidden from public UI tabs!
  const getInitialRole = () => {
    if (location.pathname.includes('teacher')) return 'teacher';
    if (location.pathname.includes('head')) return 'head';
    return 'student';
  };

  const [role, setRole] = useState(getInitialRole());
  const [mode, setMode] = useState(location.pathname.includes('signup') ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);

  // Password visibility states
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    if (location.pathname.includes('teacher')) setRole('teacher');
    else if (location.pathname.includes('head')) setRole('head');
    else setRole('student');

    if (location.pathname.includes('signup')) setMode('signup');
    else setMode('login');
  }, [location.pathname]);

  // Form states
  const [studentForm, setStudentForm] = useState({
    name: '',
    rollNumber: '',
    session: '2025-26',
    series: '22',
    phone: '',
    email: '',
    department: 'ETE',
    faculty: 'Faculty of Electrical & Computer Engineering',
    password: '',
    confirmPassword: '',
  });

  const [teacherForm, setTeacherForm] = useState({
    name: '',
    teacherId: '',
    phone: '',
    email: '',
    department: 'ETE',
    faculty: 'Faculty of Electrical & Computer Engineering',
    password: '',
    confirmPassword: '',
  });

  const [headForm, setHeadForm] = useState({
    name: '',
    headId: '',
    phone: '',
    email: '',
    department: 'ETE',
    faculty: 'Faculty of Electrical & Computer Engineering',
    password: '',
    confirmPassword: '',
  });

  const handleStudentChange = (e) => setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  const handleTeacherChange = (e) => setTeacherForm({ ...teacherForm, [e.target.name]: e.target.value });
  const handleHeadChange    = (e) => setHeadForm({ ...headForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === 'student') {
        if (mode === 'login') {
          const res = await login({
            identifier: studentForm.rollNumber.trim(),
            password: studentForm.password
          });
          if (res.success) {
            toast.success(`Welcome, ${res.user?.name || 'Student'}!`);
            navigate('/student');
          } else {
            toast.error(res.message);
          }
        } else {
          // Student Signup
          if (studentForm.password !== studentForm.confirmPassword) {
            toast.error('Passwords do not match');
            setLoading(false);
            return;
          }
          if (studentForm.password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            setLoading(false);
            return;
          }

          const res = await register('student', {
            name: studentForm.name.trim(),
            rollNumber: studentForm.rollNumber.trim(),
            session: studentForm.session.trim(),
            academicSession: studentForm.session.trim(),
            series: studentForm.series.trim(),
            phone: studentForm.phone.trim(),
            contactNo: studentForm.phone.trim(),
            email: studentForm.email.trim(),
            department: studentForm.department,
            faculty: studentForm.faculty,
            password: studentForm.password,
            confirmPassword: studentForm.confirmPassword
          });

          if (res.success) {
            toast.success('Student registration successful! Welcome to LabEval.');
            navigate('/student');
          } else {
            toast.error(res.message);
          }
        }
      } else if (role === 'teacher') {
        if (mode === 'login') {
          const res = await login({
            identifier: teacherForm.teacherId.trim().toUpperCase(),
            password: teacherForm.password
          });
          if (res.success) {
            toast.success(`Welcome, ${res.user?.name || 'Instructor'}!`);
            navigate('/teacher');
          } else {
            toast.error(res.message);
          }
        } else {
          // Teacher Signup
          if (teacherForm.password !== teacherForm.confirmPassword) {
            toast.error('Passwords do not match');
            setLoading(false);
            return;
          }
          if (teacherForm.password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            setLoading(false);
            return;
          }

          const res = await register('teacher', {
            name: teacherForm.name.trim(),
            teacherId: teacherForm.teacherId.trim().toUpperCase(),
            phone: teacherForm.phone.trim(),
            contactNo: teacherForm.phone.trim(),
            email: teacherForm.email.trim(),
            department: teacherForm.department,
            faculty: teacherForm.faculty,
            password: teacherForm.password,
            confirmPassword: teacherForm.confirmPassword
          });

          if (res.success) {
            toast.success('Teacher registration successful! Welcome to LabEval.');
            navigate('/teacher');
          } else {
            toast.error(res.message);
          }
        }
      } else if (role === 'head') {
        if (mode === 'login') {
          const res = await login({
            identifier: headForm.headId.trim().toUpperCase(),
            password: headForm.password
          });
          if (res.success) {
            toast.success(`Welcome, Department Head ${res.user?.name || ''}!`);
            navigate('/admin'); // Department Head uses department-scoped dashboard
          } else {
            toast.error(res.message);
          }
        } else {
          // Department Head Signup
          if (headForm.password !== headForm.confirmPassword) {
            toast.error('Passwords do not match');
            setLoading(false);
            return;
          }
          if (headForm.password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            setLoading(false);
            return;
          }

          const res = await register('department_head', {
            name: headForm.name.trim(),
            headId: headForm.headId.trim().toUpperCase(),
            phone: headForm.phone.trim(),
            contactNo: headForm.phone.trim(),
            email: headForm.email.trim(),
            department: headForm.department,
            departmentCode: headForm.department,
            faculty: headForm.faculty,
            password: headForm.password,
            confirmPassword: headForm.confirmPassword
          });

          if (res.success) {
            toast.success(`Department Head account registered for ${headForm.department}!`);
            navigate('/admin');
          } else {
            toast.error(res.message);
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

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
    fontFamily: 'Inter, sans-serif'
  };

  // Only Student, Teacher, Department Head (NO ADMIN)
  const roleButtons = [
    { key: 'student', label: 'Student',         Icon: GraduationCap, color: '#06b6d4' },
    { key: 'teacher', label: 'Teacher',         Icon: User,          color: '#6366f1' },
    { key: 'head',    label: 'Department Head', Icon: Shield,        color: '#2563eb' },
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
      {/* Top Bar */}
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          color: textMuted,
          textDecoration: 'none',
        }}>
          ← Back to Home
        </Link>
        <button onClick={toggleTheme} style={{
          padding: '6px 12px',
          background: card,
          border: `1px solid ${border}`,
          borderRadius: 6,
          color: textMuted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12
        }}>
          {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          <span>{isDarkMode ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: 520,
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 16,
        boxShadow: isDarkMode ? '0 12px 36px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.06)',
        overflow: 'hidden'
      }}>
        {/* Card Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <RuetLogo size={46} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: textMain, margin: 0 }}>
                Lab<span style={{ color: '#2563eb' }}>Eval</span>
              </p>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: isDarkMode ? 'rgba(37,99,235,0.2)' : '#dbeafe',
                color: isDarkMode ? '#93c5fd' : '#1e40af',
                border: `1px solid ${isDarkMode ? 'rgba(59,130,246,0.3)' : '#bfdbfe'}`,
              }}>
                RUET
              </span>
            </div>
            <p style={{ fontSize: 11, color: textMuted, marginTop: 3 }}>
              Academic Laboratory Performance Evaluation System
            </p>
          </div>
        </div>

        {/* Public Role Tabs (Student, Teacher, Department Head ONLY) */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${border}` }}>
          {roleButtons.map(({ key, label, Icon, color }) => {
            const isActive = role === key;
            return (
              <button key={key}
                onClick={() => setRole(key)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '12px 8px',
                  background: isActive ? (isDarkMode ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc') : 'transparent',
                  borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
                  color: isActive ? (isDarkMode ? '#ffffff' : color) : textMuted,
                  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 150ms',
                }}>
                <Icon size={18} color={isActive ? color : textMuted} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Mode Toggle: Sign In vs Create Account */}
        <div style={{ display: 'flex', margin: '16px 24px 0', background: isDarkMode ? '#1e293b' : '#f1f5f9', borderRadius: 8, padding: 3, border: `1px solid ${border}` }}>
          {['login', 'signup'].map(m => {
            const isModeActive = mode === m;
            const activeColor = role === 'head' ? '#2563eb' : role === 'teacher' ? '#6366f1' : '#0891b2';
            return (
              <button key={m} onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: isModeActive ? (isDarkMode ? '#0f172a' : '#ffffff') : 'transparent',
                  color: isModeActive ? activeColor : textMuted,
                  boxShadow: isModeActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: isModeActive ? `1px solid ${border}` : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ══════════════════════════════════════════════════════════════
                STUDENT LOGIN
            ══════════════════════════════════════════════════════════════ */}
            {role === 'student' && mode === 'login' && (
              <>
                <FormField label="Roll Number / Student ID">
                  <input
                    type="text"
                    name="rollNumber"
                    required
                    placeholder="e.g. 2204028"
                    value={studentForm.rollNumber}
                    onChange={handleStudentChange}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Password">
                  <PasswordInput
                    value={studentForm.password}
                    onChange={handleStudentChange}
                    name="password"
                    show={showPass}
                    onToggle={() => setShowPass(!showPass)}
                    isDarkMode={isDarkMode}
                    border={isDarkMode ? '#334155' : '#cbd5e1'}
                  />
                </FormField>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                STUDENT SIGNUP
            ══════════════════════════════════════════════════════════════ */}
            {role === 'student' && mode === 'signup' && (
              <>
                {/* Personal Information Group */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
                  Personal Information
                </div>
                <FormField label="Full Name">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Jahid Hasan"
                    value={studentForm.name}
                    onChange={handleStudentChange}
                    style={inputStyle}
                  />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Phone Number">
                    <input
                      type="text"
                      name="phone"
                      required
                      placeholder="01XXXXXXXXX"
                      value={studentForm.phone}
                      onChange={handleStudentChange}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Email">
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="student@example.com"
                      value={studentForm.email}
                      onChange={handleStudentChange}
                      style={inputStyle}
                    />
                  </FormField>
                </div>

                {/* Academic Information Group */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, paddingBottom: 4, marginTop: 6 }}>
                  Academic Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: 12 }}>
                  <FormField label="Roll Number / Student ID">
                    <input
                      type="text"
                      name="rollNumber"
                      required
                      placeholder="e.g. 2204028"
                      value={studentForm.rollNumber}
                      onChange={handleStudentChange}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Series">
                    <input
                      type="text"
                      name="series"
                      required
                      placeholder="e.g. 22"
                      value={studentForm.series}
                      onChange={handleStudentChange}
                      style={inputStyle}
                    />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Academic Session">
                    <input
                      type="text"
                      name="session"
                      required
                      placeholder="e.g. 2025-26"
                      value={studentForm.session}
                      onChange={handleStudentChange}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Department">
                    <CustomSelect
                      value={studentForm.department}
                      onChange={(val) => {
                        const found = ALL_DEPARTMENTS.find(d => d.code === val);
                        setStudentForm({ ...studentForm, department: val, faculty: found?.faculty || studentForm.faculty });
                      }}
                      options={ALL_DEPARTMENTS.map(d => ({ value: d.code, label: d.code, sublabel: d.name }))}
                      placeholder="Department"
                      icon={Building2}
                      isDarkMode={isDarkMode}
                      align="right"
                    />
                  </FormField>
                </div>

                {/* Security Group */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, paddingBottom: 4, marginTop: 6 }}>
                  Security
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Password">
                    <PasswordInput
                      value={studentForm.password}
                      onChange={handleStudentChange}
                      name="password"
                      placeholder="Min 8 chars"
                      show={showPass}
                      onToggle={() => setShowPass(!showPass)}
                      isDarkMode={isDarkMode}
                      border={isDarkMode ? '#334155' : '#cbd5e1'}
                    />
                  </FormField>
                  <FormField label="Confirm Password">
                    <PasswordInput
                      value={studentForm.confirmPassword}
                      onChange={handleStudentChange}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      show={showConfirmPass}
                      onToggle={() => setShowConfirmPass(!showConfirmPass)}
                      isDarkMode={isDarkMode}
                      border={isDarkMode ? '#334155' : '#cbd5e1'}
                    />
                  </FormField>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TEACHER LOGIN
            ══════════════════════════════════════════════════════════════ */}
            {role === 'teacher' && mode === 'login' && (
              <>
                <FormField label="Teacher ID">
                  <input
                    type="text"
                    name="teacherId"
                    required
                    placeholder="e.g. ETE-T-001 or ETE-294"
                    value={teacherForm.teacherId}
                    onChange={handleTeacherChange}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Password">
                  <PasswordInput
                    value={teacherForm.password}
                    onChange={handleTeacherChange}
                    name="password"
                    show={showPass}
                    onToggle={() => setShowPass(!showPass)}
                    isDarkMode={isDarkMode}
                    border={isDarkMode ? '#334155' : '#cbd5e1'}
                  />
                </FormField>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TEACHER SIGNUP
            ══════════════════════════════════════════════════════════════ */}
            {role === 'teacher' && mode === 'signup' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
                  Personal & Professional Information
                </div>
                <FormField label="Full Name">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Dr. Example Teacher"
                    value={teacherForm.name}
                    onChange={handleTeacherChange}
                    style={inputStyle}
                  />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Teacher ID">
                    <input
                      type="text"
                      name="teacherId"
                      required
                      placeholder="e.g. ETE-T-001"
                      value={teacherForm.teacherId}
                      onChange={handleTeacherChange}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Department">
                    <CustomSelect
                      value={teacherForm.department}
                      onChange={(val) => {
                        const found = ALL_DEPARTMENTS.find(d => d.code === val);
                        setTeacherForm({ ...teacherForm, department: val, faculty: found?.faculty || teacherForm.faculty });
                      }}
                      options={ALL_DEPARTMENTS.map(d => ({ value: d.code, label: d.code, sublabel: d.name }))}
                      placeholder="Department"
                      icon={Building2}
                      isDarkMode={isDarkMode}
                      align="right"
                    />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Phone Number">
                    <input
                      type="text"
                      name="phone"
                      required
                      placeholder="01XXXXXXXXX"
                      value={teacherForm.phone}
                      onChange={handleTeacherChange}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Email">
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="teacher@example.com"
                      value={teacherForm.email}
                      onChange={handleTeacherChange}
                      style={inputStyle}
                    />
                  </FormField>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, paddingBottom: 4, marginTop: 6 }}>
                  Security
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Password">
                    <PasswordInput
                      value={teacherForm.password}
                      onChange={handleTeacherChange}
                      name="password"
                      placeholder="Min 8 chars"
                      show={showPass}
                      onToggle={() => setShowPass(!showPass)}
                      isDarkMode={isDarkMode}
                      border={isDarkMode ? '#334155' : '#cbd5e1'}
                    />
                  </FormField>
                  <FormField label="Confirm Password">
                    <PasswordInput
                      value={teacherForm.confirmPassword}
                      onChange={handleTeacherChange}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      show={showConfirmPass}
                      onToggle={() => setShowConfirmPass(!showConfirmPass)}
                      isDarkMode={isDarkMode}
                      border={isDarkMode ? '#334155' : '#cbd5e1'}
                    />
                  </FormField>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                DEPARTMENT HEAD LOGIN
            ══════════════════════════════════════════════════════════════ */}
            {role === 'head' && mode === 'login' && (
              <>
                <FormField label="Head ID">
                  <input
                    type="text"
                    name="headId"
                    required
                    placeholder="e.g. HEAD-ETE-001"
                    value={headForm.headId}
                    onChange={handleHeadChange}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Password">
                  <PasswordInput
                    value={headForm.password}
                    onChange={handleHeadChange}
                    name="password"
                    show={showPass}
                    onToggle={() => setShowPass(!showPass)}
                    isDarkMode={isDarkMode}
                    border={isDarkMode ? '#334155' : '#cbd5e1'}
                  />
                </FormField>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                DEPARTMENT HEAD SIGNUP
            ══════════════════════════════════════════════════════════════ */}
            {role === 'head' && mode === 'signup' && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, paddingBottom: 4 }}>
                  Administrative Information
                </div>
                <FormField label="Full Name">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Dr. Example Head"
                    value={headForm.name}
                    onChange={handleHeadChange}
                    style={inputStyle}
                  />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Head ID">
                    <input
                      type="text"
                      name="headId"
                      required
                      placeholder="e.g. HEAD-ETE-001"
                      value={headForm.headId}
                      onChange={handleHeadChange}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Department">
                    <CustomSelect
                      value={headForm.department}
                      onChange={(val) => {
                        const found = ALL_DEPARTMENTS.find(d => d.code === val);
                        setHeadForm({ ...headForm, department: val, faculty: found?.faculty || headForm.faculty });
                      }}
                      options={ALL_DEPARTMENTS.map(d => ({ value: d.code, label: d.code, sublabel: d.name }))}
                      placeholder="Department"
                      icon={Building2}
                      isDarkMode={isDarkMode}
                      align="right"
                    />
                  </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Phone Number">
                    <input
                      type="text"
                      name="phone"
                      required
                      placeholder="01XXXXXXXXX"
                      value={headForm.phone}
                      onChange={handleHeadChange}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Email">
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="head@example.com"
                      value={headForm.email}
                      onChange={handleHeadChange}
                      style={inputStyle}
                    />
                  </FormField>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, paddingBottom: 4, marginTop: 6 }}>
                  Security
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
                  <FormField label="Password">
                    <PasswordInput
                      value={headForm.password}
                      onChange={handleHeadChange}
                      name="password"
                      placeholder="Min 8 chars"
                      show={showPass}
                      onToggle={() => setShowPass(!showPass)}
                      isDarkMode={isDarkMode}
                      border={isDarkMode ? '#334155' : '#cbd5e1'}
                    />
                  </FormField>
                  <FormField label="Confirm Password">
                    <PasswordInput
                      value={headForm.confirmPassword}
                      onChange={handleHeadChange}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      show={showConfirmPass}
                      onToggle={() => setShowConfirmPass(!showConfirmPass)}
                      isDarkMode={isDarkMode}
                      border={isDarkMode ? '#334155' : '#cbd5e1'}
                    />
                  </FormField>
                </div>
              </>
            )}

            {/* ── Submit Button ── */}
            {(() => {
              const btnGrad = role === 'head'
                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                : role === 'teacher'
                ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)';
              const btnShadow = role === 'head'
                ? '0 4px 14px rgba(37,99,235,0.35)'
                : role === 'teacher'
                ? '0 4px 14px rgba(99,102,241,0.35)'
                : '0 4px 14px rgba(6,182,212,0.35)';

              const roleLabel = role === 'head' ? 'Department Head' : role === 'teacher' ? 'Teacher' : 'Student';

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
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 8,
                    transition: 'all 150ms ease-out',
                  }}>
                  {loading ? (
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                  ) : (
                    <>
                      <LogIn size={15} />
                      {mode === 'login' ? `Sign In as ${roleLabel}` : `Register as ${roleLabel}`}
                    </>
                  )}
                </button>
              );
            })()}

            {/* Forgot Password Link */}
            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
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
                    borderRadius: 8
                  }}
                >
                  <KeyRound size={13} />
                  <span>Forgot or Change Password?</span>
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          initialRole={role === 'head' ? 'admin' : role}
          initialIdentifier={
            role === 'student' ? studentForm.rollNumber :
            role === 'teacher' ? teacherForm.teacherId :
            headForm.headId
          }
        />

        {/* Card Footer */}
        <div style={{
          borderTop: `1px solid ${border}`,
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: 11,
          color: textMuted,
        }}>
          Rajshahi University of Engineering & Technology &bull; Authorized Academic Access
        </div>
      </div>
    </div>
  );
}
